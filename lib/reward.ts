// lib/rewards.ts
// Daily check-in: a 7-day loop of bonus coins.
//  - a new claim opens 24 hours after the last one
//  - more than 48 hours after the last claim, the streak is broken and starts again at Day 1
//  - after Day 7 the loop starts again at Day 1
//  - each claim is bonus coins that expire after 2 days, recorded in wallet_lots + wallet_ledger
// The amounts live here on the server; the browser only shows them.
// Times are taken from the database clock, so the server's and the reader's clocks don't matter.
import "server-only";
import { dbPool } from "@/lib/db";
import { withTransaction } from "@/lib/auth/transaction";

export const CHECKIN_REWARDS = [5, 10, 15, 20, 25, 30, 50]; // Day 1 … Day 7
export const CHECKIN_GEMS = [0, 0, 0, 0, 0, 0, 2]; // extra gems per day (gems never expire)
export const REWARD_EXPIRY_DAYS = 2;

export type CheckinStatus = {
    claimedDays: number;         // days already claimed in the current loop (0–7)
    nextDay: number;             // the day the next claim gives (1–7)
    nextCoins: number;           // coins the next claim gives
    canClaim: boolean;
    nextClaimAt: string | null;  // when the next claim opens (null when it's open now)
    serverNow: string;           // the server's time, so the countdown is right whatever the reader's clock says
    rewards: number[];
    gems: number[];              // extra gems per day (0 = none)
};

type Row = { streak_day: number; last_claim_at: Date; now: Date; open: boolean; alive: boolean } | undefined;

function toStatus(row: Row, now: Date): CheckinStatus {
    let claimedDays = 0;
    let canClaim = true;
    let nextClaimAt: string | null = null;


    if (row) {
        if (!row.open) {
            // Claimed less than 24 hours ago
            canClaim = false;
            claimedDays = row.streak_day;
            nextClaimAt = new Date(row.last_claim_at.getTime() + 24 * 60 * 60 * 1000).toISOString();
        } else if (row.alive && row.streak_day < 7) {
            // Streak still going: the next day of the loop
            claimedDays = row.streak_day;
        }
        // Otherwise the streak was broken, or Day 7 is done: start again at Day 1
    }

    const nextDay = canClaim ? claimedDays + 1 : (claimedDays % 7) + 1;
    return {
        claimedDays,
        nextDay,
        nextCoins: CHECKIN_REWARDS[nextDay - 1],
        canClaim,
        nextClaimAt,
        serverNow: now.toISOString(),
        rewards: CHECKIN_REWARDS,
        gems: CHECKIN_GEMS,
    };
}

const STATUS_SQL = `
    SELECT d.streak_day, d.last_claim_at, now() AS now,
           d.last_claim_at <= now() - interval '24 hours' AS open,
           d.last_claim_at >  now() - interval '48 hours' AS alive
    FROM daily_checkins d WHERE d.user_id = $1`;

export async function getCheckinStatus(userId: string): Promise<CheckinStatus> {
    const { rows } = await dbPool.query(STATUS_SQL, [userId]);
    if (rows[0]) return toStatus(rows[0], rows[0].now);
    const { rows: clock } = await dbPool.query(`SELECT now() AS now`);
    return toStatus(undefined, clock[0].now);
}

export type ClaimResult =
    | { ok: true; day: number; coins: number; gems: number; status: CheckinStatus }
    | { ok: false; status: CheckinStatus };

// Claims today's check-in. Safe against double clicks and several tabs at once:
// the database lets only one claim through per 24 hours.
export async function claimCheckin(userId: string): Promise<ClaimResult> {
    const claimed = await withTransaction(async (client) => {
        const { rows } = await client.query(
            `INSERT INTO daily_checkins (user_id, streak_day, last_claim_at) VALUES ($1, 1, now())
             ON CONFLICT (user_id) DO UPDATE SET
                 streak_day = CASE
                     WHEN daily_checkins.last_claim_at > now() - interval '48 hours'
                     THEN (daily_checkins.streak_day % 7) + 1
                     ELSE 1
                 END,
                 last_claim_at = now()
             WHERE daily_checkins.last_claim_at <= now() - interval '24 hours'
             RETURNING streak_day`,
            [userId]
        );
        if (!rows[0]) return null; // already claimed in the last 24 hours

        const day: number = rows[0].streak_day;
        const coins = CHECKIN_REWARDS[day - 1];
        const { rows: lot } = await client.query(
            `INSERT INTO wallet_lots (user_id, currency, kind, amount, remaining, source, expires_at)
             VALUES ($1, 'coin', 'bonus', $2, $2, 'daily_checkin', now() + make_interval(days => $3))
             RETURNING id`,
            [userId, coins, REWARD_EXPIRY_DAYS]
        );
        await client.query(
            `INSERT INTO wallet_ledger (user_id, lot_id, currency, kind, delta, reason, ref_type, ref_id)
             VALUES ($1, $2, 'coin', 'bonus', $3, 'daily_checkin', 'checkin_day', $4)`,
            [userId, lot[0].id, coins, String(day)]
        );
        const gems = CHECKIN_GEMS[day - 1] ?? 0;
        if (gems > 0) {
            const { rows: gemLot } = await client.query(
                `INSERT INTO wallet_lots (user_id, currency, kind, amount, remaining, source, expires_at)
                 VALUES ($1, 'gem', 'earned', $2, $2, 'daily_checkin', NULL)
                 RETURNING id`,
                [userId, gems]
            );
            await client.query(
                `INSERT INTO wallet_ledger (user_id, lot_id, currency, kind, delta, reason, ref_type, ref_id)
                 VALUES ($1, $2, 'gem', 'earned', $3, 'daily_checkin', 'checkin_day', $4)`,
                [userId, gemLot[0].id, gems, String(day)]
            );
        }
        return { day, coins, gems };
    });

    const status = await getCheckinStatus(userId);
    return claimed ? { ok: true, ...claimed, status } : { ok: false, status };
}