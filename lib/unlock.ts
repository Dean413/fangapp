// lib/unlocks.ts
import "server-only";
import { dbPool } from "@/lib/db";
import { withTransaction } from "@/lib/auth/transaction";
import { getWalletBalance, type WalletBalance } from "@/lib/wallet";
import { chapterHtml } from "@/lib/chapterHtml";

export const CHAPTER_PRICES = [
    { maxWords: 1000, coins: 25 },
    { maxWords: 1500, coins: 35 },
    { maxWords: 2000, coins: 45 },
    { maxWords: 2500, coins: 55 },
    { maxWords: Infinity, coins: 65 },
];

export const priceForWords = (words: number) =>
    CHAPTER_PRICES.find((p) => (Number(words) || 0) <= p.maxWords)!.coins;

// Words in a chapter: the saved count, otherwise counted from the text
export function chapterWords(saved: unknown, content: string | null | undefined): number {
    const n = Number(saved);
    if (Number.isFinite(n) && n > 0) return n;
    return (content ?? "").replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
}

export type ReaderAccess = { isWriter: boolean; unlocked: Set<string>; autoUnlock: boolean };

const NO_ACCESS: ReaderAccess = { isWriter: false, unlocked: new Set(), autoUnlock: false };

// What this reader can open in a book: the writer opens everything; others, the chapters they unlocked
export async function getReaderAccess(userId: string | null, storyId: string): Promise<ReaderAccess> {
    if (!userId) return NO_ACCESS;
    const { rows } = await dbPool.query(
        `SELECT (SELECT s.user_id = $1 FROM stories s WHERE s.id = $2) AS is_writer,
                COALESCE(ARRAY(SELECT u.chapter_id::text FROM chapter_unlocks u WHERE u.user_id = $1 AND u.story_id = $2), '{}') AS unlocked,
                EXISTS (SELECT 1 FROM reader_auto_unlock a WHERE a.user_id = $1 AND a.story_id = $2) AS auto_unlock`,
        [userId, storyId]
    );
    const r = rows[0] ?? {};
    return {
        isWriter: r.is_writer === true,
        unlocked: new Set<string>(Array.isArray(r.unlocked) ? r.unlocked : []),
        autoUnlock: r.auto_unlock === true,
    };
}

export async function setAutoUnlock(userId: string, storyId: string, enabled: boolean) {
    if (enabled) {
        await dbPool.query(
            `INSERT INTO reader_auto_unlock (user_id, story_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [userId, storyId]
        );
    } else {
        await dbPool.query(`DELETE FROM reader_auto_unlock WHERE user_id = $1 AND story_id = $2`, [userId, storyId]);
    }
}

export type UnlockResult =
    | { ok: true; charged: number; wallet: WalletBalance }
    | { ok: false; code: "NOT_FOUND" | "NOT_PAID" | "NOT_ENOUGH" | "ACCOUNT"; message: string; price?: number; wallet?: WalletBalance };

class StopUnlock extends Error {
    constructor(public result: UnlockResult) {
        super(result.ok ? "ok" : result.code);
    }
}

// Unlocks one paid chapter for the reader. `chapterNumber` is the book's chapter number;
// `paywall` is the story's first paid chapter (from lib/stories.ts).
export async function unlockChapter(userId: string, storyId: string, paywall: number | null, chapterNumber: number): Promise<UnlockResult> {
    try {
        const charged = await withTransaction(async (client): Promise<number> => {
            // The account must be active
            const { rows: account } = await client.query(
                `SELECT COALESCE(account_status, 'active') AS status FROM users WHERE id = $1 FOR UPDATE`,
                [userId]
            );
            if (account[0]?.status !== "active") {
                throw new StopUnlock({ ok: false, code: "ACCOUNT", message: "Your account can't unlock chapters right now." });
            }

            // The chapter (published, with its number and length) and who wrote the book
            const { rows: found } = await client.query(
                `WITH published AS (
                     SELECT c.id, c.words, c.content,
                            COALESCE(c.chapter_number,
                                     ROW_NUMBER() OVER (ORDER BY COALESCE(c.published_at, c.created_at), c.created_at, c.id))::int AS n
                     FROM chapters c WHERE c.story_id = $1 AND c.status = 'published'
                 )
                 SELECT p.id, p.words, p.content, s.user_id AS creator_id,
                        (SELECT k.id::text FROM contracts k
                         WHERE k.status = 'signed' AND (k.story_id = s.id OR k.story_id = s.original_story_id)
                         ORDER BY (k.story_id = s.id) DESC, k.created_at DESC LIMIT 1) AS contract_id
                 FROM published p JOIN stories s ON s.id = $1
                 WHERE p.n = $2`,
                [storyId, chapterNumber]
            );
            const chapter = found[0];
            if (!chapter) throw new StopUnlock({ ok: false, code: "NOT_FOUND", message: "Chapter not found." });
            if (!(paywall != null && paywall > 0 && chapterNumber >= paywall) || chapter.creator_id === userId) {
                throw new StopUnlock({ ok: false, code: "NOT_PAID", message: "This chapter is free to read." });
            }

            // Same count as the price shown on the chapter (lib/stories.ts getChapter)
            const price = priceForWords(chapterWords(chapter.words, chapterHtml(chapter.content)));

            // Claim the unlock first: if it's already unlocked, nothing is charged
            const { rows: claimed } = await client.query(
                `INSERT INTO chapter_unlocks (user_id, chapter_id, story_id, coins, method)
                 VALUES ($1, $2, $3, $4, 'coins')
                 ON CONFLICT (user_id, chapter_id) DO NOTHING
                 RETURNING 1`,
                [userId, chapter.id, storyId, price]
            );
            if (!claimed[0]) return 0;

            // Spendable coins: bonus / VIP bonus first (soonest to expire first), then bought coins (oldest first)
            const { rows: lots } = await client.query(
                `SELECT id, kind, remaining, net_value_per_coin, purchase_id
                 FROM wallet_lots
                 WHERE user_id = $1 AND currency = 'coin' AND remaining > 0 AND (expires_at IS NULL OR expires_at > now())
                 ORDER BY (kind = 'base'), expires_at NULLS LAST, created_at, id
                 FOR UPDATE`,
                [userId]
            );
            const available = lots.reduce((sum: number, l: any) => sum + Number(l.remaining), 0);
            if (available < price) {
                throw new StopUnlock({ ok: false, code: "NOT_ENOUGH", message: "You don't have enough coins.", price });
            }

            let left = price;
            for (const lot of lots) {
                if (left <= 0) break;
                const take = Math.min(Number(lot.remaining), left);
                left -= take;
                await client.query(`UPDATE wallet_lots SET remaining = remaining - $2 WHERE id = $1`, [lot.id, take]);
                const { rows: ledger } = await client.query(
                    `INSERT INTO wallet_ledger (user_id, lot_id, currency, kind, delta, reason, ref_type, ref_id)
                     VALUES ($1, $2, 'coin', $3, $4, 'unlock', 'chapter', $5)
                     RETURNING id`,
                    [userId, lot.id, lot.kind, -take, String(chapter.id)]
                );
                // Bought coins carry their package's value per coin (kept exact, as text); bonus coins carry none
                const value: string = lot.kind === "base" ? String(lot.net_value_per_coin ?? "0") : "0";
                await client.query(
                    `INSERT INTO coin_spends (ledger_id, lot_id, user_id, coin_kind, purchase_id, coins, value_per_coin, net_revenue,
                                              story_id, chapter_id, creator_id, contract_id)
                     VALUES ($1, $2, $3, $4, $5, $6::int, $7::numeric, $7::numeric * $6::int, $8, $9, $10, $11)`,
                    [ledger[0].id, lot.id, userId, lot.kind, lot.purchase_id ?? null, take, value,
                        storyId, chapter.id, chapter.creator_id ?? null, chapter.contract_id ?? null]
                );
            }
            return price;
        });
        return { ok: true, charged, wallet: await getWalletBalance(userId) };
    } catch (error) {
        if (error instanceof StopUnlock) {
            const r = error.result;
            if (!r.ok && r.code === "NOT_ENOUGH") return { ...r, wallet: await getWalletBalance(userId) };
            return r;
        }
        throw error;
    }
}

// Has the reader unlocked this chapter (or written the book)? For reading progress.
export async function canReadPaid(userId: string, storyId: string, chapterId: string) {
    const { rows } = await dbPool.query(
        `SELECT EXISTS (SELECT 1 FROM chapter_unlocks WHERE user_id = $1 AND chapter_id::text = $3)
                OR EXISTS (SELECT 1 FROM stories WHERE id = $2 AND user_id = $1) AS ok`,
        [userId, storyId, chapterId]
    );
    return rows[0]?.ok === true;
}