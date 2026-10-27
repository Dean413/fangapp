// lib/gifts.ts
// Gifts a reader sends an author. Paid ONLY with bought coins (base): bonus coins, VIP bonus coins and gems
// can't be used. Every coin taken is recorded in coin_spends like a chapter unlock (spend_type 'gift'), so the
// author earns from it at their contract rate x the payout factor, settled at midnight with their chapter earnings.
import "server-only";
import { dbPool } from "@/lib/db";
import { withTransaction } from "@/lib/auth/transaction";
import { getWalletBalance, type WalletBalance } from "@/lib/wallet";
import type { Msg } from "@/lib/i18n";

export type GiftType = { id: number; slug: string; name: string; icon: string; coins: number };

export type GiftResult =
    | { ok: true; gift: GiftType; wallet: WalletBalance }
    | { ok: false; code: "NOT_FOUND" | "OWN_BOOK" | "NOT_ENOUGH" | "ACCOUNT"; message: Msg; price?: number; wallet?: WalletBalance };

class StopGift extends Error {
    constructor(public result: GiftResult) {
        super(result.ok ? "ok" : result.code);
    }
}

const toGift = (r: any): GiftType => ({ id: Number(r.id), slug: r.slug, name: r.name, icon: r.icon, coins: Number(r.coins) });

// The gifts on offer, in their set order
export async function listGifts(): Promise<GiftType[]> {
    const { rows } = await dbPool.query(
        `SELECT id, slug, name, icon, coins FROM gift_types WHERE active ORDER BY sort, id`
    );
    return rows.map(toGift);
}

// Sends one gift to the author of a book. All or nothing: if anything fails, no coins are taken.
export async function sendGift(userId: string, storyId: string, giftId: number): Promise<GiftResult> {
    try {
        const gift = await withTransaction(async (client): Promise<GiftType> => {
            // The account must be active. Locking it means two taps at once are paid one after the other.
            const { rows: account } = await client.query(
                `SELECT COALESCE(account_status, 'active') AS status FROM users WHERE id = $1 FOR UPDATE`,
                [userId]
            );
            if (account[0]?.status !== "active") {
                throw new StopGift({ ok: false, code: "ACCOUNT", message: "cantSendGift" });
            }

            const { rows: found } = await client.query(
                `SELECT id, slug, name, icon, coins FROM gift_types WHERE id = $1 AND active`,
                [giftId]
            );
            if (!found[0]) throw new StopGift({ ok: false, code: "NOT_FOUND", message: "giftNotFound" });
            const g = toGift(found[0]);

            // The book (not deleted, with at least one published chapter), its author and contract
            const { rows: books } = await client.query(
                `SELECT s.user_id AS creator_id,
                        (SELECT k.id::text FROM contracts k
                         WHERE k.status = 'signed' AND (k.story_id = s.id OR k.story_id = s.original_story_id)
                         ORDER BY (k.story_id = s.id) DESC, k.created_at DESC LIMIT 1) AS contract_id
                 FROM stories s
                 WHERE s.id = $1
                   AND COALESCE(s.is_deleted, false) = false
                   AND EXISTS (SELECT 1 FROM chapters c WHERE c.story_id = s.id AND c.status = 'published')`,
                [storyId]
            );
            const book = books[0];
            if (!book?.creator_id) throw new StopGift({ ok: false, code: "NOT_FOUND", message: "storyNotFound" });
            if (book.creator_id === userId) throw new StopGift({ ok: false, code: "OWN_BOOK", message: "cantGiftOwnBook" });

            // Bought coins only, oldest purchase first
            const { rows: lots } = await client.query(
                `SELECT id, remaining, net_value_per_coin, purchase_id
                 FROM wallet_lots
                 WHERE user_id = $1 AND currency = 'coin' AND kind = 'base' AND remaining > 0
                   AND (expires_at IS NULL OR expires_at > now())
                 ORDER BY created_at, id
                 FOR UPDATE`,
                [userId]
            );
            const available = lots.reduce((sum: number, l: any) => sum + Number(l.remaining), 0);
            if (available < g.coins) {
                throw new StopGift({ ok: false, code: "NOT_ENOUGH", message: "notEnoughBoughtCoins", price: g.coins });
            }

            const { rows: sent } = await client.query(
                `INSERT INTO gift_sends (sender_id, story_id, creator_id, gift_type_id, coins)
                 VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                [userId, storyId, book.creator_id, g.id, g.coins]
            );
            const sendId = sent[0].id;

            let left = g.coins;
            for (const lot of lots) {
                if (left <= 0) break;
                const take = Math.min(Number(lot.remaining), left);
                left -= take;
                await client.query(`UPDATE wallet_lots SET remaining = remaining - $2 WHERE id = $1`, [lot.id, take]);
                const { rows: ledger } = await client.query(
                    `INSERT INTO wallet_ledger (user_id, lot_id, currency, kind, delta, reason, ref_type, ref_id)
                     VALUES ($1, $2, 'coin', 'base', $3, 'gift', 'gift', $4)
                     RETURNING id`,
                    [userId, lot.id, -take, String(sendId)]
                );
                // Each coin carries its pack's value, exactly as for a chapter unlock
                await client.query(
                    `INSERT INTO coin_spends (ledger_id, lot_id, user_id, coin_kind, purchase_id, coins, value_per_coin, net_revenue,
                                              story_id, chapter_id, creator_id, contract_id, spend_type, gift_send_id)
                     VALUES ($1, $2, $3, 'base', $4, $5::int, $6::numeric, $6::numeric * $5::int,
                             $7, NULL, $8, $9, 'gift', $10)`,
                    [ledger[0].id, lot.id, userId, lot.purchase_id ?? null, take, String(lot.net_value_per_coin ?? "0"),
                        storyId, book.creator_id, book.contract_id ?? null, sendId]
                );
            }
            return g;
        });
        return { ok: true, gift, wallet: await getWalletBalance(userId) };
    } catch (error) {
        if (error instanceof StopGift) {
            const r = error.result;
            if (!r.ok && r.code === "NOT_ENOUGH") return { ...r, wallet: await getWalletBalance(userId) };
            return r;
        }
        throw error;
    }
}