// lib/adRewards.ts
// Rewarded ads in the mobile app: 20 ads per reader per day (resets at midnight UTC), 2 ads unlock 1 chapter.
// Every finished ad is one row in ad_rewards; rows used for an unlock point at that chapter, so writer
// earnings from ads can be worked out later.
import "server-only";
import type { PoolClient } from "pg";
import { dbPool } from "@/lib/db";
import { withTransaction } from "@/lib/auth/transaction";

export const ADS_PER_DAY = 20;
export const ADS_PER_CHAPTER = 2;

// Start of today (UTC), as SQL
const TODAY = `(date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')`;

export type AdStatus = {
    watched: number; // ads finished today
    limit: number; // 20
    unused: number; // finished today and not used for a chapter yet
    perChapter: number; // 2
    resetsAt: string; // next midnight UTC
};

type Queryable = Pick<PoolClient, "query">;

export async function getAdStatus(userId: string, db: Queryable = dbPool): Promise<AdStatus> {
    const { rows } = await db.query(
        `SELECT count(*)::int AS watched,
                count(*) FILTER (WHERE used_at IS NULL)::int AS unused,
                ${TODAY} + interval '1 day' AS resets_at
         FROM ad_rewards WHERE user_id = $1 AND created_at >= ${TODAY}`,
        [userId]
    );
    const r = rows[0];
    return {
        watched: Number(r.watched),
        limit: ADS_PER_DAY,
        unused: Number(r.unused),
        perChapter: ADS_PER_CHAPTER,
        resetsAt: new Date(r.resets_at).toISOString(),
    };
}

// Saves one finished ad. Never more than 20 a day; the same transaction is only counted once.
export async function recordAdView(input: {
    userId: string;
    transactionId: string;
    nonce: string | null;
    adUnit: string | null;
    source: "ssv" | "client";
}): Promise<"OK" | "DUPLICATE" | "LIMIT" | "NO_USER"> {
    return withTransaction(async (client) => {
        const { rows: user } = await client.query(`SELECT 1 FROM users WHERE id::text = $1 FOR UPDATE`, [input.userId]);
        if (!user[0]) return "NO_USER";

        const { rows: seen } = await client.query(`SELECT 1 FROM ad_rewards WHERE transaction_id = $1`, [input.transactionId]);
        if (seen[0]) return "DUPLICATE";

        const status = await getAdStatus(input.userId, client);
        if (status.watched >= ADS_PER_DAY) return "LIMIT";

        await client.query(
            `INSERT INTO ad_rewards (user_id, transaction_id, nonce, ad_unit, source)
             VALUES ($1::uuid, $2, $3, $4, $5)
             ON CONFLICT (transaction_id) DO NOTHING`,
            [input.userId, input.transactionId, input.nonce, input.adUnit, input.source]
        );
        return "OK";
    });
}

// Has the ad with this nonce (sent by the app as SSV custom data) been counted yet?
export async function adCounted(userId: string, nonce: string) {
    const { rows } = await dbPool.query(`SELECT 1 FROM ad_rewards WHERE user_id::text = $1 AND nonce = $2`, [userId, nonce]);
    return Boolean(rows[0]);
}

export type AdUnlockResult =
    | { ok: true; unlocked: boolean; status: AdStatus }
    | { ok: false; code: "NOT_FOUND" | "NOT_PAID" | "ACCOUNT" | "EARLIER_LOCKED" | "NEED_ADS"; firstLocked?: number; status?: AdStatus };

// Uses 2 of today's unused ads to unlock a paid chapter. Same order rule as coin unlocks.
export async function unlockWithAds(userId: string, storyId: string, paywall: number | null, chapterNumber: number): Promise<AdUnlockResult> {
    return withTransaction(async (client) => {
        const { rows: account } = await client.query(
            `SELECT COALESCE(account_status, 'active') AS status FROM users WHERE id = $1 FOR UPDATE`,
            [userId]
        );
        if (account[0]?.status !== "active") return { ok: false, code: "ACCOUNT" };

        const published = `WITH published AS (
                SELECT c.id,
                       COALESCE(c.chapter_number,
                                ROW_NUMBER() OVER (ORDER BY COALESCE(c.published_at, c.created_at), c.created_at, c.id))::int AS n
                FROM chapters c WHERE c.story_id = $1 AND c.status = 'published'
            )`;

        const { rows: found } = await client.query(
            `${published}
             SELECT p.id, s.user_id AS creator_id FROM published p JOIN stories s ON s.id = $1 WHERE p.n = $2`,
            [storyId, chapterNumber]
        );
        const chapter = found[0];
        if (!chapter) return { ok: false, code: "NOT_FOUND" };
        if (!(paywall != null && paywall > 0 && chapterNumber >= paywall) || chapter.creator_id === userId) {
            return { ok: false, code: "NOT_PAID" };
        }

        const { rows: earlier } = await client.query(
            `${published}
             SELECT min(p.n)::int AS first FROM published p
             WHERE p.n >= $3 AND p.n < $2
               AND NOT EXISTS (SELECT 1 FROM chapter_unlocks u WHERE u.user_id = $4 AND u.chapter_id = p.id)`,
            [storyId, chapterNumber, paywall, userId]
        );
        if (earlier[0]?.first != null) return { ok: false, code: "EARLIER_LOCKED", firstLocked: Number(earlier[0].first) };

        // Already unlocked: nothing is used
        const { rows: had } = await client.query(
            `SELECT 1 FROM chapter_unlocks WHERE user_id = $1 AND chapter_id = $2`,
            [userId, chapter.id]
        );
        if (had[0]) return { ok: true, unlocked: false, status: await getAdStatus(userId, client) };

        const { rows: ads } = await client.query(
            `SELECT id FROM ad_rewards
             WHERE user_id = $1 AND used_at IS NULL AND created_at >= ${TODAY}
             ORDER BY created_at LIMIT $2 FOR UPDATE`,
            [userId, ADS_PER_CHAPTER]
        );
        if (ads.length < ADS_PER_CHAPTER) {
            return { ok: false, code: "NEED_ADS", status: await getAdStatus(userId, client) };
        }

        await client.query(
            `INSERT INTO chapter_unlocks (user_id, chapter_id, story_id, coins, method)
             VALUES ($1, $2, $3, 0, 'ad')
             ON CONFLICT (user_id, chapter_id) DO NOTHING`,
            [userId, chapter.id, storyId]
        );
        await client.query(
            `UPDATE ad_rewards SET used_at = now(), chapter_id = $2, story_id = $3 WHERE id = ANY($1::uuid[])`,
            [ads.map((a: { id: string }) => a.id), chapter.id, storyId]
        );
        return { ok: true, unlocked: true, status: await getAdStatus(userId, client) };
    });
}