// lib/transaction.ts
// The reader's wallet history, read from wallet_ledger (every coin added or spent, never edited).
// Bonus coins that ran out unused show as "Expired" entries at the time they expired (from wallet_lots),
// so the running balance always matches what the wallet shows.
// Coins only (bought coins + bonus coins); gems have their own balance.
/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { dbPool } from "@/lib/db";

export type TxFilter = "all" | "topup" | "vip" | "earned" | "spent" | "expired";
export const TX_FILTERS: TxFilter[] = ["all", "topup", "vip", "earned", "spent", "expired"];

// A day range (YYYY-MM-DD, in the reader's own timezone). Either end can be left out.
export type TxRange = { from?: string | null; to?: string | null };
const DAY = /^\d{4}-\d{2}-\d{2}$/;
export function cleanDay(value: unknown): string | null {
    if (typeof value !== "string" || !DAY.test(value)) return null;
    const d = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value ? null : value;
}
export const TX_PAGE_SIZE = 20;

// Our own code: TXN + 14 digits (bonus coins, rewards, unlocks, expiries)
export const TX_CODE = /^TXN\d{14}$/;
// What a history entry is called: the payment provider's own transaction id for paid top-ups and VIP charges
// (Stripe pi_… / in_…, PayPal capture id), otherwise our own code
export const TX_ID = /^[A-Za-z0-9_-]{6,80}$/;

export type TxCategory = "topup" | "vip" | "bonus" | "reward" | "spent" | "expired";

export type Transaction = {
    id: string;              // transaction code, e.g. TXN48210375961042
    at: string;              // ISO time
    type: string;            // short label for the Type column
    category: TxCategory;    // for colours
    description: string;
    amount: number;          // + added, − spent / expired (0 for VIP charges, which move no coins)
    amountCents: number | null; // VIP charges: what was paid, in US cents
    coinKind: "coins" | "bonus coins";
    balance: number;         // coins + bonus coins right after this entry
    expiresAt: string | null;
    reason: string;
    refId: string | null;
    // For top-ups: the payment provider and its transaction id (what Stripe / PayPal call it)
    provider: "stripe" | "paypal" | null;
    providerTxn: string | null;
};

// Every coin event for one reader, with the running balance after each
const EVENTS = `
    WITH events AS (
        SELECT CASE WHEN pay.provider_txn IS NOT NULL AND l.kind = 'base' THEN pay.provider_txn ELSE l.tx_code END AS id,
               l.created_at AS at, l.delta, l.kind, l.reason, l.ref_type, l.ref_id,
               w.expires_at, pay.provider AS pay_provider, pay.provider_txn AS pay_txn, NULL::int AS pay_cents
        FROM wallet_ledger l
        LEFT JOIN wallet_lots w ON w.id = l.lot_id
        LEFT JOIN payments pay ON l.ref_type = 'payment' AND pay.id::text = l.ref_id AND pay.user_id = l.user_id
        WHERE l.user_id = $1 AND l.currency = 'coin'
        UNION ALL
        SELECT w.expiry_code, w.expires_at, -w.remaining, w.kind, 'expired', 'lot', w.source, w.expires_at, NULL, NULL, NULL::int
        FROM wallet_lots w
        WHERE w.user_id = $1 AND w.currency = 'coin' AND w.expires_at <= now() AND w.remaining > 0
        UNION ALL
        -- VIP charges (first payment and every renewal), named by the provider's id. No coins move, so the coin balance doesn't change
        SELECT v.provider_txn, v.paid_at, 0, 'vip', 'vip', 'payment', v.vip_plan, NULL::timestamptz, v.provider, v.provider_txn, v.price_cents
        FROM payments v
        WHERE v.user_id = $1 AND v.product = 'vip' AND v.status = 'paid' AND v.provider_txn IS NOT NULL
    ),
    ordered AS (
        SELECT e.*, SUM(e.delta) OVER (ORDER BY e.at, e.id ROWS UNBOUNDED PRECEDING) AS balance
        FROM events e
    )
`;

const FILTER_SQL: Record<TxFilter, string> = {
    all: "true",
    topup: "reason IN ('purchase', 'topup')",
    vip: "reason = 'vip'",
    earned: "delta > 0 AND reason NOT IN ('purchase', 'topup')",
    spent: "delta < 0 AND reason <> 'expired'",
    expired: "reason = 'expired'",
};

const SOURCE_NAMES: Record<string, string> = {
    signup_bonus: "Sign-up bonus",
    daily_checkin: "Daily check-in",
    reading_time: "Reading reward",
};

function describe(r: any): { type: string; category: TxCategory; description: string } {
    const reason: string = r.reason;
    const ref: string | null = r.ref_id ?? null;
    switch (reason) {
        case "signup_bonus":
            return { type: "Bonus", category: "bonus", description: "Sign-up bonus" };
        case "daily_checkin":
            return { type: "Reward", category: "reward", description: ref ? `Daily check-in · Day ${ref}` : "Daily check-in" };
        case "reading_time":
            return { type: "Reward", category: "reward", description: ref ? `Reading reward · ${ref} minutes` : "Reading reward" };
        case "purchase":
        case "topup":
            return { type: "Top Up", category: "topup", description: "Coins top up" };
        case "unlock":
            return { type: "Unlock", category: "spent", description: "Chapter unlock" };
        case "vip":
            return { type: "VIP", category: "vip", description: r.ref_id === "monthly" ? "Monthly VIP" : "Weekly VIP" };
        case "expired":
            return { type: "Expired", category: "expired", description: `${SOURCE_NAMES[ref ?? ""] ?? "Bonus coins"} expired` };
        default:
            return { type: Number(r.delta) > 0 ? "Added" : "Spent", category: Number(r.delta) > 0 ? "reward" : "spent", description: reason.replace(/_/g, " ") };
    }
}

function toTx(r: any): Transaction {
    const d = describe(r);
    return {
        id: r.id,
        at: new Date(r.at).toISOString(),
        ...d,
        amount: Number(r.delta),
        amountCents: r.reason === "vip" && r.pay_cents != null ? Number(r.pay_cents) : null,
        coinKind: r.kind === "base" || r.kind === "vip" ? "coins" : "bonus coins",
        balance: Number(r.balance),
        expiresAt: r.reason !== "expired" && r.expires_at ? new Date(r.expires_at).toISOString() : null,
        reason: r.reason,
        refId: r.ref_id ?? null,
        provider: r.pay_provider === "stripe" || r.pay_provider === "paypal" ? r.pay_provider : null,
        providerTxn: r.pay_txn ?? null,
    };
}

// A page of history, newest first. `before` = the last id of the previous page.
export async function listTransactions(userId: string, filter: TxFilter, before?: string | null, range: TxRange = {}) {
    const params: any[] = [userId];
    let extra = "";

    if (before && TX_ID.test(before)) {
        params.push(before);
        extra += ` AND (at, id) < (SELECT at, id FROM ordered WHERE id = $${params.length})`;
    }

    // Days are the reader's own days (users.timezone, UTC if it isn't a real zone)
    const from = cleanDay(range.from);
    const to = cleanDay(range.to);
    if (from || to) {
        params.push(userId);
        const tz = `COALESCE((SELECT z.name FROM users u JOIN pg_timezone_names z ON z.name = u.timezone WHERE u.id = $${params.length}), 'UTC')`;
        if (from) {
            params.push(from);
            extra += ` AND (at AT TIME ZONE ${tz})::date >= $${params.length}::date`;
        }
        if (to) {
            params.push(to);
            extra += ` AND (at AT TIME ZONE ${tz})::date <= $${params.length}::date`;
        }
    }

    params.push(TX_PAGE_SIZE + 1);
    const { rows } = await dbPool.query(
        `${EVENTS}
         SELECT * FROM ordered
         WHERE ${FILTER_SQL[filter]}${extra}
         ORDER BY at DESC, id DESC
         LIMIT $${params.length}`,
        params
    );
    const hasMore = rows.length > TX_PAGE_SIZE;
    return { transactions: rows.slice(0, TX_PAGE_SIZE).map(toTx), hasMore };
}

// One entry (only the reader's own)
export async function getTransaction(userId: string, id: string): Promise<Transaction | null> {
    if (!TX_ID.test(id)) return null;
    const { rows } = await dbPool.query(`${EVENTS} SELECT * FROM ordered WHERE id = $2`, [userId, id]);
    return rows[0] ? toTx(rows[0]) : null;
}