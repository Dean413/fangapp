// lib/wallet.ts
// Readers' coins and gems.
// Every credit is a "lot" in wallet_lots with its own kind, amount left and expiry:
//  - coin / base       bought with money; carries its net value per coin (has monetary value)
//  - coin / bonus      promotional coins (sign-up bonus, store bundle bonus); no purchase value
//  - coin / vip_bonus  VIP promotional coins; no purchase value
//  - gem  / earned     earned free from tasks or rewards; no monetary value
// wallet_ledger records every change and is never edited, so balances can always be audited.
import "server-only";
import { dbPool } from "@/lib/db";
import { withTransaction } from "@/lib/auth/transaction";
import { logError } from "@/lib/log";

export const SIGNUP_BONUS_COINS = 50;
export const SIGNUP_BONUS_DAYS = 2;

// Gives the 50 sign-up bonus coins, once per account ever. Safe to call on every sign-in:
// a second call does nothing (the database allows only one sign-up bonus per account).
export async function grantSignupBonus(userId: string): Promise<boolean> {
    return withTransaction(async (client) => {
        const { rows } = await client.query(
            `INSERT INTO wallet_lots (user_id, currency, kind, amount, remaining, source, expires_at)
             VALUES ($1, 'coin', 'bonus', $2, $2, 'signup_bonus', now() + make_interval(days => $3))
             ON CONFLICT (user_id) WHERE source = 'signup_bonus' DO NOTHING
             RETURNING id`,
            [userId, SIGNUP_BONUS_COINS, SIGNUP_BONUS_DAYS]
        );
        if (rows.length === 0) return false;

        await client.query(
            `INSERT INTO wallet_ledger (user_id, lot_id, currency, kind, delta, reason)
             VALUES ($1, $2, 'coin', 'bonus', $3, 'signup_bonus')`,
            [userId, rows[0].id, SIGNUP_BONUS_COINS]
        );
        return true;
    });
}

// Gives the bonus without ever blocking sign-in if something goes wrong
export async function grantSignupBonusSafely(userId: string) {
    try {
        await grantSignupBonus(userId);
    } catch (error) {
        logError("Sign-up bonus failed:", error);
    }
}

export type WalletBalance = {
    coins: number;         // bought with money
    bonusCoins: number;    // bonus coins only (no VIP bonus), not yet expired
    vipBonusCoins: number; // VIP bonus coins, not yet expired
    gems: number;
    nextExpiry: string | null; // when the soonest bonus coins or gems run out
};

// What the reader can spend right now (expired lots don't count)
export async function getWalletBalance(userId: string): Promise<WalletBalance> {
    const { rows } = await dbPool.query(
        `SELECT
            COALESCE(SUM(remaining) FILTER (WHERE currency = 'coin' AND kind = 'base'), 0)::int AS coins,
            COALESCE(SUM(remaining) FILTER (WHERE currency = 'coin' AND kind = 'bonus'), 0)::int AS bonus_coins,
            COALESCE(SUM(remaining) FILTER (WHERE currency = 'coin' AND kind = 'vip_bonus'), 0)::int AS vip_bonus_coins,
            COALESCE(SUM(remaining) FILTER (WHERE currency = 'gem'), 0)::int AS gems,
            MIN(expires_at) FILTER (WHERE expires_at IS NOT NULL) AS next_expiry
         FROM wallet_lots
         WHERE user_id = $1 AND remaining > 0 AND (expires_at IS NULL OR expires_at > now())`,
        [userId]
    );
    const r = rows[0] ?? {};
    return {
        coins: Number(r.coins ?? 0),
        bonusCoins: Number(r.bonus_coins ?? 0),
        vipBonusCoins: Number(r.vip_bonus_coins ?? 0),
        gems: Number(r.gems ?? 0),
        nextExpiry: r.next_expiry ? new Date(r.next_expiry).toISOString() : null,
    };
}