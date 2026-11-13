// lib/bulkUnlock.ts
// Unlocking many chapters at once (the Download button in the app).
// Starts at the chapter the reader is on (or the first locked one before it, since chapters unlock in order)
// and covers the next 10 / 30 / 50 chapters or all the rest. Chapters already unlocked or free cost nothing.
// Same rules as one unlock (lib/unlock.ts): VIP free unlocks first, then bonus coins, then bought coins.
// All or nothing: if the coins aren't enough, nothing is unlocked.
import "server-only";
import { dbPool } from "@/lib/db";
import { withTransaction } from "@/lib/auth/transaction";
import { getWalletBalance, type WalletBalance } from "@/lib/wallet";
import { chapterHtml } from "@/lib/chapterHtml";
import { getVipStatus } from "@/lib/vip";
import { chapterWords, priceForWords } from "@/lib/unlock";

export const BULK_COUNTS = [10, 30, 50];

type Queryable = { query: (text: string, params?: any[]) => Promise<{ rows: any[] }> };
type Row = { id: string; n: number; title: string | null; price: number; locked: boolean };

export type BulkOption = { count: number; all: boolean; locked: number; price: number };
export type BulkQuote = {
    start: number;
    startTitle: string | null;
    remaining: number; // chapters from the start to the end of the book
    options: BulkOption[];
    freeUnlocksLeft: number;
};

// The book's published chapters from `from` on, with their price and whether this reader still has to unlock them
async function loadChapters(db: Queryable, userId: string, storyId: string, paywall: number | null, from: number | null) {
    const { rows } = await db.query(
        `WITH published AS (
             SELECT c.id, c.title, c.words, CASE WHEN COALESCE(c.words, 0) > 0 THEN NULL ELSE c.content END AS content,
                    COALESCE(c.chapter_number,
                             ROW_NUMBER() OVER (ORDER BY COALESCE(c.published_at, c.created_at), c.created_at, c.id))::int AS n
             FROM chapters c WHERE c.story_id = $1 AND c.status = 'published'
         )
         SELECT p.id::text AS id, p.n, p.title, p.words, p.content,
                (s.user_id = $2) AS is_writer,
                EXISTS (SELECT 1 FROM chapter_unlocks u WHERE u.user_id = $2 AND u.chapter_id = p.id) AS unlocked
         FROM published p JOIN stories s ON s.id = $1
         ORDER BY p.n`,
        [storyId, userId]
    );
    const paid = (n: number) => paywall != null && paywall > 0 && n >= paywall;
    const all: Row[] = rows.map((r: any) => ({
        id: r.id,
        n: Number(r.n),
        title: r.title ?? null,
        price: priceForWords(chapterWords(r.words, chapterHtml(r.content))),
        locked: !r.is_writer && paid(Number(r.n)) && !r.unlocked,
    }));
    // Chapters unlock in order: a locked chapter before `from` comes first
    const firstLocked = all.find((c) => c.locked)?.n ?? null;
    // No chapter given: start at the first locked one
    const start = Math.max(1, from == null ? (firstLocked ?? 1) : firstLocked != null ? Math.min(from, firstLocked) : from);
    return { start, chapters: all.filter((c) => c.n >= start) };
}

// What `count` chapters from the start cost (the first `freeLeft` locked ones are free for VIPs)
function priceOf(chapters: Row[], count: number, freeLeft: number) {
    const locked = chapters.slice(0, count).filter((c) => c.locked);
    const price = locked.slice(freeLeft).reduce((sum, c) => sum + c.price, 0);
    return { locked, price };
}

export async function getBulkQuote(userId: string, storyId: string, paywall: number | null, from: number | null): Promise<BulkQuote> {
    const { start, chapters } = await loadChapters(dbPool, userId, storyId, paywall, from);
    const vip = await getVipStatus(userId);
    const remaining = chapters.length;
    const counts = BULK_COUNTS.filter((c) => c < remaining).map((count) => ({ count, all: false }));
    counts.push({ count: remaining, all: true });
    return {
        start,
        startTitle: chapters[0]?.title ?? null,
        remaining,
        freeUnlocksLeft: vip.freeUnlocksLeft,
        options: counts.map(({ count, all }) => {
            const { locked, price } = priceOf(chapters, count, vip.freeUnlocksLeft);
            return { count, all, locked: locked.length, price };
        }),
    };
}

export type BulkResult =
    | { ok: true; unlocked: number; charged: number; wallet: WalletBalance }
    | { ok: false; code: "ACCOUNT" | "NOTHING" | "PRICE_CHANGED" | "NOT_ENOUGH"; price?: number; wallet?: WalletBalance };

class Stop extends Error {
    constructor(public result: BulkResult) {
        super(result.ok ? "ok" : result.code);
    }
}

// `count` null = all the rest. `expectedPrice` is the price the reader saw: if it changed, nothing happens.
export async function bulkUnlock(
    userId: string,
    storyId: string,
    paywall: number | null,
    from: number | null,
    count: number | null,
    expectedPrice: number
): Promise<BulkResult> {
    try {
        const { unlocked, charged } = await withTransaction(async (client) => {
            const { rows: account } = await client.query(
                `SELECT COALESCE(account_status, 'active') AS status FROM users WHERE id = $1 FOR UPDATE`,
                [userId]
            );
            if (account[0]?.status !== "active") throw new Stop({ ok: false, code: "ACCOUNT" });

            const { chapters } = await loadChapters(client, userId, storyId, paywall, from);
            const vip = await getVipStatus(userId, client);
            const { locked, price } = priceOf(chapters, count ?? chapters.length, vip.freeUnlocksLeft);
            if (locked.length === 0) throw new Stop({ ok: false, code: "NOTHING" });
            if (price !== expectedPrice) throw new Stop({ ok: false, code: "PRICE_CHANGED", price });

            const { rows: owner } = await client.query(
                `SELECT s.user_id AS creator_id,
                        (SELECT k.id::text FROM contracts k
                         WHERE k.status = 'signed' AND (k.story_id = s.id OR k.story_id = s.original_story_id)
                         ORDER BY (k.story_id = s.id) DESC, k.created_at DESC LIMIT 1) AS contract_id
                 FROM stories s WHERE s.id = $1`,
                [storyId]
            );
            const creatorId = owner[0]?.creator_id ?? null;
            const contractId = owner[0]?.contract_id ?? null;

            // VIP free unlocks first
            const free = locked.slice(0, vip.freeUnlocksLeft);
            const paid = locked.slice(vip.freeUnlocksLeft);
            let unlocked = 0;
            for (const ch of free) {
                const { rows } = await client.query(
                    `INSERT INTO chapter_unlocks (user_id, chapter_id, story_id, coins, method)
                     VALUES ($1, $2, $3, 0, 'vip')
                     ON CONFLICT (user_id, chapter_id) DO NOTHING
                     RETURNING 1`,
                    [userId, ch.id, storyId]
                );
                if (rows[0]) unlocked++;
            }
            if (paid.length === 0) return { unlocked, charged: 0 };

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
            if (available < price) throw new Stop({ ok: false, code: "NOT_ENOUGH", price });

            // Each chapter is paid for on its own, so the writer's earnings are counted per chapter
            let charged = 0;
            for (const ch of paid) {
                const { rows: claimed } = await client.query(
                    `INSERT INTO chapter_unlocks (user_id, chapter_id, story_id, coins, method)
                     VALUES ($1, $2, $3, $4, 'coins')
                     ON CONFLICT (user_id, chapter_id) DO NOTHING
                     RETURNING 1`,
                    [userId, ch.id, storyId, ch.price]
                );
                if (!claimed[0]) continue;
                unlocked++;
                charged += ch.price;
                let left = ch.price;
                for (const lot of lots) {
                    if (left <= 0) break;
                    const take = Math.min(Number(lot.remaining), left);
                    if (take <= 0) continue;
                    left -= take;
                    lot.remaining = Number(lot.remaining) - take;
                    await client.query(`UPDATE wallet_lots SET remaining = remaining - $2 WHERE id = $1`, [lot.id, take]);
                    const { rows: ledger } = await client.query(
                        `INSERT INTO wallet_ledger (user_id, lot_id, currency, kind, delta, reason, ref_type, ref_id)
                         VALUES ($1, $2, 'coin', $3, $4, 'unlock', 'chapter', $5)
                         RETURNING id`,
                        [userId, lot.id, lot.kind, -take, ch.id]
                    );
                    const value: string = lot.kind === "base" ? String(lot.net_value_per_coin ?? "0") : "0";
                    await client.query(
                        `INSERT INTO coin_spends (ledger_id, lot_id, user_id, coin_kind, purchase_id, coins, value_per_coin, net_revenue,
                                                  story_id, chapter_id, creator_id, contract_id)
                         VALUES ($1, $2, $3, $4, $5, $6::int, $7::numeric, $7::numeric * $6::int, $8, $9, $10, $11)`,
                        [ledger[0].id, lot.id, userId, lot.kind, lot.purchase_id ?? null, take, value,
                            storyId, ch.id, creatorId, contractId]
                    );
                }
            }
            return { unlocked, charged };
        });
        return { ok: true, unlocked, charged, wallet: await getWalletBalance(userId) };
    } catch (error) {
        if (error instanceof Stop) {
            const r = error.result;
            if (!r.ok && r.code === "NOT_ENOUGH") return { ...r, wallet: await getWalletBalance(userId) };
            return r;
        }
        throw error;
    }
}