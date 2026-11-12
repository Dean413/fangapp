// lib/engagement.ts
// General Engagement Rewards (mobile app):
//  - ad tasks: watch a rewarded ad to the end for bonus coins, a few times a day (resets at 00:00 UTC).
//    Counted separately from the 20 chapter-unlock ads (lib/adRewards.ts). The app marks these ads with
//    SSV custom data "task:<task id>:<nonce>", so /api/ads/ssv knows to count them here.
//  - social: open one of our pages (Instagram, YouTube, ...) for bonus coins, once per platform, ever.
//    Nobody can check a follow, so tapping Go and coming back is enough (the usual way).
// Coins are bonus coins that expire after REWARD_EXPIRY_DAYS, like the other rewards.
import "server-only";
import type { PoolClient } from "pg";
import { dbPool } from "@/lib/db";
import { withTransaction } from "@/lib/auth/transaction";
import { REWARD_EXPIRY_DAYS } from "@/lib/reward";
import { REFERRAL_REWARDS } from "@/lib/referral";

export const AD_TASKS = [
    { id: "ad5", coins: 5, perDay: 15 },
    { id: "ad3", coins: 3, perDay: 10 },
] as const;
export type AdTaskId = (typeof AD_TASKS)[number]["id"];

// Change the links to the client's real pages. The app gets them from here, so no app update is needed.
export const SOCIAL_TASKS = [
    { id: "instagram", coins: 15, url: "https://www.instagram.com/fangapp" },
    { id: "youtube", coins: 15, url: "https://www.youtube.com/@fangapp" },
    { id: "tiktok", coins: 15, url: "https://www.tiktok.com/@fangapp" },
    { id: "facebook", coins: 15, url: "https://www.facebook.com/fangapp" },
    { id: "linkedin", coins: 15, url: "https://www.linkedin.com/company/fangapp" },
    { id: "x", coins: 15, url: "https://x.com/fangapp" },
    { id: "community", coins: 15, url: "https://www.facebook.com/groups/fangapp" },
] as const;
export type SocialTaskId = (typeof SOCIAL_TASKS)[number]["id"];

const TODAY = `(date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')`;

export const findAdTask = (id: unknown) => AD_TASKS.find((t) => t.id === id) ?? null;
export const findSocialTask = (id: unknown) => SOCIAL_TASKS.find((t) => t.id === id) ?? null;

export type EngagementStatus = {
    ads: { id: AdTaskId; coins: number; perDay: number; done: number }[];
    social: { id: SocialTaskId; coins: number; url: string; claimed: boolean }[];
    inviteCoins: number; // "up to" coins for one invited friend (the invite screen)
    resetsAt: string;    // next 00:00 UTC
};

export async function getEngagementStatus(userId: string): Promise<EngagementStatus> {
    const [{ rows: today }, { rows: social }, { rows: clock }] = await Promise.all([
        dbPool.query(
            `SELECT task, count(*)::int AS n FROM engagement_rewards
             WHERE user_id = $1 AND task NOT LIKE 'social:%' AND created_at >= ${TODAY}
             GROUP BY task`,
            [userId]
        ),
        dbPool.query(`SELECT task FROM engagement_rewards WHERE user_id = $1 AND task LIKE 'social:%'`, [userId]),
        dbPool.query(`SELECT ${TODAY} + interval '1 day' AS resets_at`),
    ]);
    const done = new Map<string, number>(today.map((r: { task: string; n: number }) => [r.task, Number(r.n)]));
    const claimed = new Set(social.map((r: { task: string }) => r.task));
    return {
        ads: AD_TASKS.map((t) => ({ id: t.id, coins: t.coins, perDay: t.perDay, done: done.get(t.id) ?? 0 })),
        social: SOCIAL_TASKS.map((t) => ({ id: t.id, coins: t.coins, url: t.url, claimed: claimed.has(`social:${t.id}`) })),
        inviteCoins: Object.values(REFERRAL_REWARDS).reduce((a, b) => a + b, 0),
        resetsAt: new Date(clock[0].resets_at).toISOString(),
    };
}

// Adds the coins: one wallet lot + ledger line, and links the reward row to it
async function payCoins(client: PoolClient, userId: string, rewardId: number, coins: number, reason: string, refId: string) {
    const { rows: lot } = await client.query(
        `INSERT INTO wallet_lots (user_id, currency, kind, amount, remaining, source, expires_at)
         VALUES ($1, 'coin', 'bonus', $2, $2, $3, now() + make_interval(days => $4))
         RETURNING id`,
        [userId, coins, reason, REWARD_EXPIRY_DAYS]
    );
    await client.query(
        `INSERT INTO wallet_ledger (user_id, lot_id, currency, kind, delta, reason, ref_type, ref_id)
         VALUES ($1, $2, 'coin', 'bonus', $3, $4, 'engagement', $5)`,
        [userId, lot[0].id, coins, reason, refId]
    );
    await client.query(`UPDATE engagement_rewards SET lot_id = $2 WHERE id = $1`, [rewardId, lot[0].id]);
}

// One finished task ad. Never more than the task's daily limit; the same transaction is only counted once.
export async function recordTaskAd(input: {
    userId: string;
    task: string;
    transactionId: string;
    nonce: string | null;
    source: "ssv" | "client";
}): Promise<"OK" | "DUPLICATE" | "LIMIT" | "NO_USER" | "UNKNOWN"> {
    const task = findAdTask(input.task);
    if (!task) return "UNKNOWN";
    return withTransaction(async (client) => {
        const { rows: user } = await client.query(
            `SELECT 1 FROM users WHERE id::text = $1 AND COALESCE(account_status, 'active') = 'active' FOR UPDATE`,
            [input.userId]
        );
        if (!user[0]) return "NO_USER";

        const { rows: seen } = await client.query(`SELECT 1 FROM engagement_rewards WHERE transaction_id = $1`, [input.transactionId]);
        if (seen[0]) return "DUPLICATE";

        const { rows: count } = await client.query(
            `SELECT count(*)::int AS n FROM engagement_rewards WHERE user_id = $1::uuid AND task = $2 AND created_at >= ${TODAY}`,
            [input.userId, task.id]
        );
        if (Number(count[0].n) >= task.perDay) return "LIMIT";

        const { rows: made } = await client.query(
            `INSERT INTO engagement_rewards (user_id, task, transaction_id, nonce, source, coins)
             VALUES ($1::uuid, $2, $3, $4, $5, $6)
             ON CONFLICT (transaction_id) DO NOTHING
             RETURNING id`,
            [input.userId, task.id, input.transactionId, input.nonce, input.source, task.coins]
        );
        if (!made[0]) return "DUPLICATE";
        await payCoins(client, input.userId, Number(made[0].id), task.coins, "ad_reward", task.id);
        return "OK";
    });
}

// Has the task ad with this nonce been counted yet?
export async function taskAdCounted(userId: string, nonce: string) {
    const { rows } = await dbPool.query(`SELECT 1 FROM engagement_rewards WHERE user_id::text = $1 AND nonce = $2`, [userId, nonce]);
    return Boolean(rows[0]);
}

// Social follow: pays once per platform. Returns the coins, or 0 if it was paid before.
export async function claimSocial(userId: string, platform: SocialTaskId): Promise<number> {
    const task = findSocialTask(platform);
    if (!task) return 0;
    return withTransaction(async (client) => {
        const { rows: made } = await client.query(
            `INSERT INTO engagement_rewards (user_id, task, source, coins)
             VALUES ($1, $2, 'social', $3)
             ON CONFLICT DO NOTHING
             RETURNING id`,
            [userId, `social:${task.id}`, task.coins]
        );
        if (!made[0]) return 0;
        await payCoins(client, userId, Number(made[0].id), task.coins, "social_follow", task.id);
        return task.coins;
    });
}