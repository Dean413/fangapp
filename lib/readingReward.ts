// lib/readingRewards.ts
// Reading-time rewards, measured by the server.
//  - While a chapter is open and the reader is active, the reading page sends a "still reading" signal every 30 seconds.
//    The browser never says how long someone read: the server counts the real time between signals
//    (database clock), at most 60 seconds per signal. Signals closer than 25 seconds apart are ignored,
//    so sending them faster, or from several tabs, earns nothing extra.
//  - A gap of more than 75 seconds (tab closed, phone locked) starts a new reading stretch and counts nothing.
//  - Reading time runs in 24-hour periods. A period starts with the first signal after the last one ended.
//  - Each milestone pays once per period, in bonus coins that expire after 2 days.
import "server-only";
import { dbPool } from "@/lib/db";
import { withTransaction } from "@/lib/auth/transaction";
import { REWARD_EXPIRY_DAYS } from "@/lib/reward";
import { recordDailyReading } from "./readingStat";

export const READING_MILESTONES = [
    { minutes: 15, coins: 5 },
    { minutes: 30, coins: 8 },
    { minutes: 60, coins: 15 },
    { minutes: 90, coins: 22 },
];

export type ReadingStatus = {
    seconds: number;               // read in the current period
    periodEndsAt: string | null;   // when the period (and the claims) reset; null when no period is running
    serverNow: string;
    milestones: { minutes: number; coins: number; reached: boolean; claimed: boolean }[];
};

// One "still reading" signal. Returns the seconds read in the current period.
export async function recordReadingBeat(userId: string): Promise<number> {
    await recordDailyReading(userId); // streak and most active day (never throws)
    const { rows } = await dbPool.query(
        `INSERT INTO reading_time (user_id, period_start, seconds, last_beat_at) VALUES ($1, date_trunc('milliseconds', now()), 0, now())
         ON CONFLICT (user_id) DO UPDATE SET
             period_start = CASE WHEN reading_time.period_start <= now() - interval '24 hours'
                                 THEN date_trunc('milliseconds', now()) ELSE reading_time.period_start END,
             seconds = CASE
                 WHEN reading_time.period_start <= now() - interval '24 hours' THEN 0
                 WHEN now() - reading_time.last_beat_at > interval '75 seconds' THEN reading_time.seconds
                 ELSE LEAST(reading_time.seconds + LEAST(FLOOR(EXTRACT(EPOCH FROM now() - reading_time.last_beat_at))::int, 60), 86400)
             END,
             last_beat_at = now()
         WHERE reading_time.last_beat_at <= now() - interval '25 seconds'
            OR reading_time.period_start <= now() - interval '24 hours'
         RETURNING seconds`,
        [userId]
    );
    if (rows[0]) return Number(rows[0].seconds);
    const { rows: current } = await dbPool.query(`SELECT seconds FROM reading_time WHERE user_id = $1`, [userId]);
    return Number(current[0]?.seconds ?? 0);
}

export async function getReadingStatus(userId: string): Promise<ReadingStatus> {
    const { rows } = await dbPool.query(
        `SELECT now() AS now, t.seconds, t.period_start + interval '24 hours' AS ends_at,
                COALESCE(ARRAY(SELECT c.minutes FROM reading_reward_claims c
                               WHERE c.user_id = t.user_id
                                 AND date_trunc('milliseconds', c.period_start) = date_trunc('milliseconds', t.period_start)), '{}') AS claimed
         FROM (SELECT 1) one
         LEFT JOIN reading_time t ON t.user_id = $1 AND t.period_start > now() - interval '24 hours'`,
        [userId]
    );
    const r = rows[0];
    const seconds = Number(r.seconds ?? 0);
    const claimed: number[] = Array.isArray(r.claimed) ? r.claimed.map(Number) : [];
    return {
        seconds,
        periodEndsAt: r.ends_at ? new Date(r.ends_at).toISOString() : null,
        serverNow: new Date(r.now).toISOString(),
        milestones: READING_MILESTONES.map((m) => ({
            ...m,
            reached: seconds >= m.minutes * 60,
            claimed: claimed.includes(m.minutes),
        })),
    };
}

export type ReadingClaim =
    | { ok: true; coins: number; status: ReadingStatus }
    | { ok: false; code: "UNKNOWN" | "NOT_REACHED" | "ALREADY_CLAIMED"; status: ReadingStatus };

// Pays a milestone if the server's own count has reached it; once per period, however many claims arrive at once
export async function claimReadingReward(userId: string, minutes: number): Promise<ReadingClaim> {
    const milestone = READING_MILESTONES.find((m) => m.minutes === minutes);
    if (!milestone) return { ok: false, code: "UNKNOWN", status: await getReadingStatus(userId) };

    const result = await withTransaction(async (client) => {
        const { rows } = await client.query(
            `SELECT date_trunc('milliseconds', period_start) AS period_key, seconds FROM reading_time
             WHERE user_id = $1 AND period_start > now() - interval '24 hours'
             FOR UPDATE`,
            [userId]
        );
        const t = rows[0];
        if (!t || Number(t.seconds) < milestone.minutes * 60) return "NOT_REACHED" as const;

        // The reader's row is locked above, so claims for one reader are checked one at a time.
        // Periods are compared to the millisecond (JavaScript dates have no microseconds).
        const { rows: done } = await client.query(
            `SELECT 1 FROM reading_reward_claims
             WHERE user_id = $1 AND minutes = $3 AND date_trunc('milliseconds', period_start) = $2`,
            [userId, t.period_key, milestone.minutes]
        );
        if (done[0]) return "ALREADY_CLAIMED" as const;

        const { rows: claim } = await client.query(
            `INSERT INTO reading_reward_claims (user_id, period_start, minutes, coins) VALUES ($1, $2, $3, $4)
             ON CONFLICT DO NOTHING RETURNING minutes`,
            [userId, t.period_key, milestone.minutes, milestone.coins]
        );
        if (!claim[0]) return "ALREADY_CLAIMED" as const;

        const { rows: lot } = await client.query(
            `INSERT INTO wallet_lots (user_id, currency, kind, amount, remaining, source, expires_at)
             VALUES ($1, 'coin', 'bonus', $2, $2, 'reading_time', now() + make_interval(days => $3))
             RETURNING id`,
            [userId, milestone.coins, REWARD_EXPIRY_DAYS]
        );
        await client.query(
            `INSERT INTO wallet_ledger (user_id, lot_id, currency, kind, delta, reason, ref_type, ref_id)
             VALUES ($1, $2, 'coin', 'bonus', $3, 'reading_time', 'reading_minutes', $4)`,
            [userId, lot[0].id, milestone.coins, String(milestone.minutes)]
        );
        return "OK" as const;
    });

    const status = await getReadingStatus(userId);
    if (result === "OK") return { ok: true, coins: milestone.coins, status };
    return { ok: false, code: result, status };
}


// Reading Task: 1 gem for 30 minutes of reading, given automatically, once per 24-hour reading period.
// Gems never expire.
export const READING_GEM = { minutes: 30, gems: 1 };

// Gives the reading gem if the server's own count has reached 30 minutes in the current period.
// Returns true only on the call that actually gave it (never twice, however many signals arrive at once).
export async function grantReadingGem(userId: string): Promise<boolean> {
    return withTransaction(async (client) => {
        const { rows } = await client.query(
            `SELECT date_trunc('milliseconds', period_start) AS period_key, seconds FROM reading_time
             WHERE user_id = $1 AND period_start > now() - interval '24 hours'
             FOR UPDATE`,
            [userId]
        );
        const t = rows[0];
        if (!t || Number(t.seconds) < READING_GEM.minutes * 60) return false;

        const { rows: claim } = await client.query(
            `INSERT INTO reading_gem_claims (user_id, period_start, gems) VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING RETURNING user_id`,
            [userId, t.period_key, READING_GEM.gems]
        );
        if (!claim[0]) return false;

        const { rows: lot } = await client.query(
            `INSERT INTO wallet_lots (user_id, currency, kind, amount, remaining, source, expires_at)
             VALUES ($1, 'gem', 'earned', $2, $2, 'reading_gem', NULL)
             RETURNING id`,
            [userId, READING_GEM.gems]
        );
        await client.query(
            `INSERT INTO wallet_ledger (user_id, lot_id, currency, kind, delta, reason, ref_type, ref_id)
             VALUES ($1, $2, 'gem', 'earned', $3, 'reading_gem', 'reading_minutes', $4)`,
            [userId, lot[0].id, READING_GEM.gems, String(READING_GEM.minutes)]
        );
        return true;
    });
}
