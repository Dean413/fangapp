// lib/referral.ts
// Referral links: /?ref=<public ID of the reader who shares>.
//  - the visitor's cookie (set in proxy.ts) is saved on their NEW profile as referred_by
//  - when that reader makes their FIRST paid coin top-up, the sharer gets bonus coins (no money value)
// Only accounts created in the last 24 hours can be attached, so existing readers are never touched.
import "server-only";
import type { PoolClient } from "pg";
import { cookies } from "next/headers";
import { dbPool } from "@/lib/db";
import { logError } from "@/lib/log";

export const REFERRAL_COOKIE = "fang_ref";
export const REFERRAL_REWARD_COINS = 100;
export const REFERRAL_REWARD_DAYS = 14;
export const REFERRAL_MAX_REWARDS = 20; // per sharer

// Called after sign-in: saves who invited this reader (once, for brand new accounts only)
export async function rememberReferrer(userId: string) {
    try {
        const code = (await cookies()).get(REFERRAL_COOKIE)?.value;
        if (!code || !/^[A-Za-z0-9]{4,20}$/.test(code)) return;
        await dbPool.query(
            `UPDATE reader_profiles me
                SET referred_by = r.user_id
               FROM reader_profiles r
               JOIN users u ON u.id = r.user_id
              WHERE me.user_id = $1
                AND me.referred_by IS NULL
                AND me.created_at > now() - interval '24 hours'
                AND r.public_id = $2
                AND r.user_id <> me.user_id
                AND u.account_status = 'active'
                AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.user_id = me.user_id AND p.status = 'paid')`,
            [userId, code]
        );
    } catch (error) {
        logError("Referral save failed:", error);
    }
}

// Called inside the payment transaction, after a coin top-up was credited.
// A savepoint means a problem here can never undo the reader's payment.
export async function rewardReferrer(client: PoolClient, userId: string, paymentId: number) {
    await client.query("SAVEPOINT referral");
    try {
        const { rows } = await client.query(
            `SELECT rp.referred_by FROM reader_profiles rp
             JOIN users u ON u.id = rp.referred_by AND u.account_status = 'active'
             WHERE rp.user_id = $1`,
            [userId]
        );
        const referrer: string | undefined = rows[0]?.referred_by;
        if (!referrer) {
            await client.query("RELEASE SAVEPOINT referral");
            return;
        }

        // Only the first paid coin top-up counts (this payment is already marked paid)
        const { rows: earlier } = await client.query(
            `SELECT 1 FROM payments WHERE user_id = $1 AND status = 'paid' AND product = 'coins' AND id <> $2 LIMIT 1`,
            [userId, paymentId]
        );
        if (earlier.length > 0) {
            await client.query("RELEASE SAVEPOINT referral");
            return;
        }

        // One reward at a time per sharer, with a cap
        await client.query(`SELECT 1 FROM users WHERE id = $1 FOR UPDATE`, [referrer]);
        const { rows: done } = await client.query(
            `SELECT count(*)::int AS n FROM wallet_lots WHERE user_id = $1 AND source = 'referral'`,
            [referrer]
        );
        if (Number(done[0]?.n ?? 0) >= REFERRAL_MAX_REWARDS) {
            await client.query("RELEASE SAVEPOINT referral");
            return;
        }

        const { rows: made } = await client.query(
            `INSERT INTO wallet_lots (user_id, currency, kind, amount, remaining, source, expires_at)
             VALUES ($1, 'coin', 'bonus', $2, $2, 'referral', now() + make_interval(days => $3))
             RETURNING id`,
            [referrer, REFERRAL_REWARD_COINS, REFERRAL_REWARD_DAYS]
        );
        await client.query(
            `INSERT INTO wallet_ledger (user_id, lot_id, currency, kind, delta, reason, ref_type, ref_id)
             VALUES ($1, $2, 'coin', 'bonus', $3, 'referral', 'payment', $4)`,
            [referrer, made[0].id, REFERRAL_REWARD_COINS, String(paymentId)]
        );
        await client.query("RELEASE SAVEPOINT referral");
    } catch (error) {
        await client.query("ROLLBACK TO SAVEPOINT referral");
        logError("Referral reward failed:", error);
    }
}

export async function getReferralStats(userId: string) {
    const { rows } = await dbPool.query(
        `SELECT rp.public_id,
                (SELECT count(*)::int FROM reader_profiles x WHERE x.referred_by = rp.user_id) AS joined,
                (SELECT count(*)::int FROM wallet_lots l WHERE l.user_id = rp.user_id AND l.source = 'referral') AS rewarded,
                (SELECT COALESCE(sum(l.amount), 0)::int FROM wallet_lots l WHERE l.user_id = rp.user_id AND l.source = 'referral') AS coins
         FROM reader_profiles rp WHERE rp.user_id = $1`,
        [userId]
    );
    const r = rows[0];
    if (!r) return null;
    return {
        code: r.public_id as string,
        joined: Number(r.joined),
        rewarded: Number(r.rewarded),
        coins: Number(r.coins),
        rewardCoins: REFERRAL_REWARD_COINS,
        maxRewards: REFERRAL_MAX_REWARDS,
    };
}