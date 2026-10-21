import "server-only";
import { dbPool } from "@/lib/db";
import { withTransaction } from "@/lib/auth/transaction";

// The two VIP plans (prices in USD)
export const VIP_PLANS = {
    weekly: { days: 7, freeUnlocksPerDay: 3, dailyBonusCoins: 10, priceUsd: 9.99 },
    monthly: { days: 30, freeUnlocksPerDay: 5, dailyBonusCoins: 20, priceUsd: 29.99 },
} as const;

export type VipPlan = keyof typeof VIP_PLANS;

// A pool or a transaction client
type Queryable = { query: (text: string, params?: any[]) => Promise<{ rows: any[] }> };

export type VipStatus = {
    active: boolean;
    plan: VipPlan | null;
    endsAt: string | null;
    freeUnlocksPerDay: number;
    freeUnlocksLeft: number;
};

const NOT_VIP: VipStatus = { active: false, plan: null, endsAt: null, freeUnlocksPerDay: 0, freeUnlocksLeft: 0 };

// The reader's current VIP plan (the one that lasts longest) and how many free unlocks they have left
// today. "Today" starts at the reader's own midnight (their saved timezone, UTC until one is saved).
export async function getVipStatus(userId: string | null, db: Queryable = dbPool): Promise<VipStatus> {
    if (!userId) return NOT_VIP;
    const { rows } = await db.query(
        `WITH tz AS (SELECT COALESCE(NULLIF(timezone, ''), 'UTC') AS name FROM users WHERE id = $1)
         SELECT v.plan, v.ends_at,
                (SELECT count(*)::int FROM chapter_unlocks u
                 WHERE u.user_id = $1 AND u.method = 'vip'
                   AND u.created_at >= date_trunc('day', now() AT TIME ZONE (SELECT name FROM tz)) AT TIME ZONE (SELECT name FROM tz)) AS used
         FROM vip_subscriptions v
         WHERE v.user_id = $1 AND v.starts_at <= now() AND v.ends_at > now()
         ORDER BY v.ends_at DESC
         LIMIT 1`,
        [userId]
    );
    const row = rows[0];
    if (!row) return NOT_VIP;
    const plan = row.plan as VipPlan;
    const perDay = VIP_PLANS[plan]?.freeUnlocksPerDay ?? 0;
    return {
        active: true,
        plan,
        endsAt: new Date(row.ends_at).toISOString(),
        freeUnlocksPerDay: perDay,
        freeUnlocksLeft: Math.max(0, perDay - Number(row.used || 0)),
    };
}

// Saves the reader's timezone (a real timezone name only; changes at most once every 24 hours),
// then credits today's VIP bonus coins if they haven't had them yet. Safe to call as often as you like.
export async function syncVipDay(userId: string, timezone: string | null): Promise<{ credited: number }> {
    return withTransaction(async (client): Promise<{ credited: number }> => {
        // One at a time per reader
        await client.query(`SELECT 1 FROM users WHERE id = $1 FOR UPDATE`, [userId]);

        if (timezone && timezone.length <= 64) {
            const { rows: valid } = await client.query(`SELECT 1 FROM pg_timezone_names WHERE name = $1`, [timezone]);
            if (valid[0]) {
                await client.query(
                    `UPDATE users
                     SET timezone = $2,
                         timezone_changed_at = CASE WHEN timezone IS NULL THEN NULL ELSE now() END
                     WHERE id = $1
                       AND timezone IS DISTINCT FROM $2
                       AND (timezone IS NULL OR timezone_changed_at IS NULL OR timezone_changed_at < now() - interval '24 hours')`,
                    [userId, timezone]
                );
            }
        }

        // The longest-lasting active plan
        const { rows: subs } = await client.query(
            `SELECT id, plan, ends_at FROM vip_subscriptions
             WHERE user_id = $1 AND starts_at <= now() AND ends_at > now()
             ORDER BY ends_at DESC LIMIT 1`,
            [userId]
        );
        const sub = subs[0];
        if (!sub) return { credited: 0 };
        const coins = VIP_PLANS[sub.plan as VipPlan]?.dailyBonusCoins ?? 0;
        if (coins <= 0) return { credited: 0 };

        // Today's date for this reader, then claim it (a second try finds the row already there)
        const { rows: claim } = await client.query(
            `INSERT INTO vip_daily_bonus (user_id, subscription_id, day, coins)
             VALUES ($1, $2, (now() AT TIME ZONE (SELECT COALESCE(NULLIF(timezone, ''), 'UTC') FROM users WHERE id = $1))::date, $3)
             ON CONFLICT (user_id, day) DO NOTHING
             RETURNING day`,
            [userId, sub.id, coins]
        );
        if (!claim[0]) return { credited: 0 };

        // The coins: VIP bonus, no purchase value, they end with the plan
        const { rows: lot } = await client.query(
            `INSERT INTO wallet_lots (user_id, currency, kind, amount, remaining, source, expires_at)
             VALUES ($1, 'coin', 'vip_bonus', $2, $2, 'vip_daily', $3)
             RETURNING id`,
            [userId, coins, sub.ends_at]
        );
        await client.query(
            `INSERT INTO wallet_ledger (user_id, lot_id, currency, kind, delta, reason, ref_type, ref_id)
             VALUES ($1, $2, 'coin', 'vip_bonus', $3, 'vip_daily_bonus', 'vip_subscription', $4)`,
            [userId, lot[0].id, coins, String(sub.id)]
        );
        await client.query(`UPDATE vip_daily_bonus SET lot_id = $3 WHERE user_id = $1 AND day = $2`, [userId, claim[0].day, lot[0].id]);

        return { credited: coins };
    });
}