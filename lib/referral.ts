// lib/referral.ts
// Invite links: /?ref=<public ID of the reader who shares>. The sharer earns bonus coins when:
//   clicks  every 10 different visitors open their link             +10  (up to CLICK_MAX_REWARDS times)
//   join    an invited friend signs up and confirms their email      +50
//   read    that friend reads for 15 minutes                         +30
//   topup   that friend makes their first paid coin top-up           +110
// Rules (the "Invitation rules" sheet):
//  - only brand new accounts can be invited (attached within 24 hours of sign-up, before any payment)
//  - a friend's rewards only count during their first 7 days
//  - a visitor or friend on the same network (IP) as the sharer doesn't count
//  - each reward pays once (referral_rewards has one row per reward), coins expire after REFERRAL_REWARD_DAYS
// Where the friend comes from:
//  - website: the visitor's cookie (set in proxy.ts) is saved on their NEW profile as referred_by
//  - app: the code from the Play Store install is sent to /api/referral/claim after sign-in
import "server-only";
import { createHmac } from "crypto";
import type { PoolClient } from "pg";
import { cookies } from "next/headers";
import { dbPool } from "@/lib/db";
import { withTransaction } from "@/lib/auth/transaction";
import { logError } from "@/lib/log";

export const REFERRAL_COOKIE = "fang_ref";
export const REFERRAL_REWARDS = { clicks: 10, join: 50, read: 30, topup: 110 } as const;
export const REFERRAL_CLICK_GOAL = 10;      // different visitors per click reward
export const REFERRAL_CLICK_MAX_REWARDS = 10; // click rewards per sharer (100 coins)
export const REFERRAL_MAX_FRIENDS = 20;     // friends rewarded per sharer, for each of join / read / topup
export const REFERRAL_READ_MINUTES = 15;
export const REFERRAL_FRIEND_DAYS = 7;
export const REFERRAL_REWARD_DAYS = 14;

// Kept for the website's wallet card
export const REFERRAL_REWARD_COINS = REFERRAL_REWARDS.topup;
export const REFERRAL_MAX_REWARDS = REFERRAL_MAX_FRIENDS;

type Kind = keyof typeof REFERRAL_REWARDS;
type FriendKind = Exclude<Kind, "clicks">;

const CODE = /^[A-Za-z0-9]{4,20}$/;

// ---------- paying ----------

// Pays one reward to the sharer, inside the caller's transaction. Returns false if it was already paid,
// the cap is reached or the sharer's account is closed.
async function grant(client: PoolClient, referrerId: string, friendId: string | null, kind: Kind, step: string): Promise<boolean> {
    // One reward at a time per sharer
    const { rows: sharer } = await client.query(
        `SELECT 1 FROM users WHERE id = $1 AND account_status = 'active' FOR UPDATE`,
        [referrerId]
    );
    if (!sharer[0]) return false;

    const { rows: done } = await client.query(
        `SELECT count(*)::int AS n FROM referral_rewards WHERE referrer_id = $1 AND kind = $2`,
        [referrerId, kind]
    );
    const cap = kind === "clicks" ? REFERRAL_CLICK_MAX_REWARDS : REFERRAL_MAX_FRIENDS;
    if (Number(done[0]?.n ?? 0) >= cap) return false;

    const coins = REFERRAL_REWARDS[kind];
    const { rows: made } = await client.query(
        `INSERT INTO referral_rewards (referrer_id, friend_id, kind, step, coins)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (referrer_id, kind, step) DO NOTHING
         RETURNING id`,
        [referrerId, friendId, kind, step, coins]
    );
    if (!made[0]) return false;

    const { rows: lot } = await client.query(
        `INSERT INTO wallet_lots (user_id, currency, kind, amount, remaining, source, expires_at)
         VALUES ($1, 'coin', 'bonus', $2, $2, 'referral', now() + make_interval(days => $3))
         RETURNING id`,
        [referrerId, coins, REFERRAL_REWARD_DAYS]
    );
    await client.query(
        `INSERT INTO wallet_ledger (user_id, lot_id, currency, kind, delta, reason, ref_type, ref_id)
         VALUES ($1, $2, 'coin', 'bonus', $3, 'referral', 'referral', $4)`,
        [referrerId, lot[0].id, coins, kind]
    );
    await client.query(`UPDATE referral_rewards SET lot_id = $2 WHERE id = $1`, [made[0].id, lot[0].id]);
    return true;
}

// Who invited this friend, if the friend can still earn rewards for them (confirmed email, first 7 days,
// not on the sharer's network, this reward not paid yet)
async function sharerFor(client: PoolClient, friendId: string, kind: FriendKind): Promise<string | null> {
    const { rows } = await client.query(
        `SELECT rp.referred_by
         FROM reader_profiles rp
         JOIN users f ON f.id = rp.user_id
         WHERE rp.user_id = $1
           AND rp.referred_by IS NOT NULL
           AND f.email_verified_at IS NOT NULL
           AND f.account_status = 'active'
           AND rp.created_at > now() - make_interval(days => $3)
           AND NOT EXISTS (SELECT 1 FROM referral_rewards r WHERE r.referrer_id = rp.referred_by AND r.kind = $2 AND r.step = $1::text)
           AND NOT EXISTS (
               SELECT 1 FROM user_activity a JOIN user_activity b ON b.ip = a.ip
               WHERE a.user_id = rp.user_id AND b.user_id = rp.referred_by AND a.ip IS NOT NULL
           )`,
        [friendId, kind, REFERRAL_FRIEND_DAYS]
    );
    return rows[0]?.referred_by ?? null;
}

async function rewardFriendStep(friendId: string, kind: FriendKind) {
    try {
        // Quick check first: most readers were not invited, or were paid already
        const { rows } = await dbPool.query(
            `SELECT 1 FROM reader_profiles rp
             WHERE rp.user_id = $1 AND rp.referred_by IS NOT NULL
               AND rp.created_at > now() - make_interval(days => $3)
               AND NOT EXISTS (SELECT 1 FROM referral_rewards r WHERE r.referrer_id = rp.referred_by AND r.kind = $2 AND r.step = $1::text)`,
            [friendId, kind, REFERRAL_FRIEND_DAYS]
        );
        if (!rows[0]) return;
        await withTransaction(async (client) => {
            const sharer = await sharerFor(client, friendId, kind);
            if (sharer) await grant(client, sharer, friendId, kind, friendId);
        });
    } catch (error) {
        logError(`Referral ${kind} reward failed:`, error);
    }
}

// ---------- the four rewards ----------

// Called after sign-in (and by /api/referral/claim from the app): saves who invited this reader
// (once, brand new accounts only), then pays the "friend joins" reward once the email is confirmed.
export async function rememberReferrer(userId: string, code?: string) {
    try {
        const ref = code ?? (await cookies()).get(REFERRAL_COOKIE)?.value;
        if (ref && CODE.test(ref)) {
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
                [userId, ref]
            );
        }
    } catch (error) {
        logError("Referral save failed:", error);
    }
    await rewardFriendStep(userId, "join");
}

// Called by the reading signal once the friend has read 15 minutes in the current period
export async function rewardReferralReading(userId: string, seconds: number) {
    if (seconds < REFERRAL_READ_MINUTES * 60) return;
    await rewardFriendStep(userId, "read");
}

// Called inside the payment transaction, after a coin top-up was credited.
// A savepoint means a problem here can never undo the reader's payment.
export async function rewardReferrer(client: PoolClient, userId: string, paymentId: number) {
    await client.query("SAVEPOINT referral");
    try {
        // Only the first paid coin top-up counts (this payment is already marked paid)
        const { rows: earlier } = await client.query(
            `SELECT 1 FROM payments WHERE user_id = $1 AND status = 'paid' AND product = 'coins' AND id <> $2 LIMIT 1`,
            [userId, paymentId]
        );
        const sharer = earlier.length > 0 ? null : await sharerFor(client, userId, "topup");
        if (sharer) await grant(client, sharer, userId, "topup", userId);
        await client.query("RELEASE SAVEPOINT referral");
    } catch (error) {
        await client.query("ROLLBACK TO SAVEPOINT referral");
        logError("Referral top-up reward failed:", error);
    }
}

// One visit to an invite link. Each visitor (by IP) counts once per link; the sharer's own visits
// and visits from the sharer's network don't count. Every 10 visitors pays the click reward.
export async function recordReferralClick(code: string, ip: string | null, viewerId: string | null) {
    if (!CODE.test(code) || !ip) return;
    try {
        const { rows } = await dbPool.query(
            `SELECT rp.user_id FROM reader_profiles rp
             JOIN users u ON u.id = rp.user_id AND u.account_status = 'active'
             WHERE rp.public_id = $1`,
            [code]
        );
        const referrerId: string | undefined = rows[0]?.user_id;
        if (!referrerId || referrerId === viewerId) return;

        const { rows: own } = await dbPool.query(`SELECT 1 FROM user_activity WHERE user_id = $1 AND ip = $2 LIMIT 1`, [referrerId, ip]);
        if (own[0]) return;

        const secret = process.env.REFERRAL_SECRET || process.env.JWT_ACCESS_SECRET || "fang-dev";
        const visitor = createHmac("sha256", secret).update(ip).digest("hex");
        const { rows: added } = await dbPool.query(
            `INSERT INTO referral_clicks (referrer_id, visitor) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING 1`,
            [referrerId, visitor]
        );
        if (!added[0]) return;

        await withTransaction(async (client) => {
            const { rows: counts } = await client.query(
                `SELECT (SELECT count(*)::int FROM referral_clicks WHERE referrer_id = $1) AS clicks,
                        (SELECT count(*)::int FROM referral_rewards WHERE referrer_id = $1 AND kind = 'clicks') AS paid`,
                [referrerId]
            );
            const earned = Math.min(Math.floor(Number(counts[0].clicks) / REFERRAL_CLICK_GOAL), REFERRAL_CLICK_MAX_REWARDS);
            for (let step = Number(counts[0].paid) + 1; step <= earned; step++) {
                await grant(client, referrerId, null, "clicks", String(step));
            }
        });
    } catch (error) {
        logError("Referral click failed:", error);
    }
}

// ---------- the invite page ----------

export type ReferralHistoryItem = { id: number; kind: Kind; coins: number; createdAt: string };

export async function getReferralStats(userId: string) {
    const { rows } = await dbPool.query(
        `SELECT rp.public_id,
                (SELECT count(*)::int FROM reader_profiles x WHERE x.referred_by = rp.user_id) AS joined,
                (SELECT count(*)::int FROM referral_clicks c WHERE c.referrer_id = rp.user_id) AS clicks,
                (SELECT count(*)::int FROM referral_rewards r WHERE r.referrer_id = rp.user_id AND r.kind = 'clicks') AS click_rewards,
                (SELECT count(*)::int FROM wallet_lots l WHERE l.user_id = rp.user_id AND l.source = 'referral') AS rewarded,
                (SELECT COALESCE(sum(l.amount), 0)::int FROM wallet_lots l WHERE l.user_id = rp.user_id AND l.source = 'referral') AS coins
         FROM reader_profiles rp WHERE rp.user_id = $1`,
        [userId]
    );
    const r = rows[0];
    if (!r) return null;

    const { rows: history } = await dbPool.query(
        `SELECT id, kind, coins, created_at FROM referral_rewards
         WHERE referrer_id = $1 ORDER BY created_at DESC LIMIT 50`,
        [userId]
    );

    const clicks = Number(r.clicks);
    const clicksDone = Number(r.click_rewards) >= REFERRAL_CLICK_MAX_REWARDS;
    return {
        code: r.public_id as string,
        joined: Number(r.joined),
        rewarded: Number(r.rewarded),
        coins: Number(r.coins),
        clicks,
        clickGoal: REFERRAL_CLICK_GOAL,
        clickProgress: clicksDone ? REFERRAL_CLICK_GOAL : clicks % REFERRAL_CLICK_GOAL, // people towards the next click reward
        clicksDone,
        readMinutes: REFERRAL_READ_MINUTES,
        rewards: REFERRAL_REWARDS,
        rewardDays: REFERRAL_REWARD_DAYS,
        history: history.map((h): ReferralHistoryItem => ({
            id: Number(h.id),
            kind: h.kind,
            coins: Number(h.coins),
            createdAt: new Date(h.created_at).toISOString(),
        })),
        // For the website's wallet card
        rewardCoins: REFERRAL_REWARD_COINS,
        maxRewards: REFERRAL_MAX_REWARDS,
    };
}