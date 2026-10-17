// lib/transactions.ts
// The reader's wallet history, read from wallet_ledger (every coin added or spent, never edited).
// Bonus coins that ran out unused show as "Expired" entries at the time they expired (from wallet_lots),
// so the running balance always matches what the wallet shows.
// Coins only (bought coins + bonus coins); gems have their own balance.
/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { dbPool } from "@/lib/db";

export type TxFilter = "all" | "earned" | "spent" | "expired";
export const TX_FILTERS: TxFilter[] = ["all", "earned", "spent", "expired"];
export const TX_PAGE_SIZE = 20;

// TXN + 14 digits (the code readers see and send to support)
export const TX_CODE = /^TXN\d{14}$/;

export type TxCategory = "topup" | "bonus" | "reward" | "spent" | "expired";

export type Transaction = {
    id: string;              // transaction code, e.g. TXN48210375961042
    at: string;              // ISO time
    type: string;            // short label for the Type column
    category: TxCategory;    // for colours
    description: string;
    amount: number;          // + added, − spent / expired
    coinKind: "coins" | "bonus coins";
    balance: number;         // coins + bonus coins right after this entry
    expiresAt: string | null;
    reason: string;
    refId: string | null;
};

// Every coin event for one reader, with the running balance after each
const EVENTS = `
    WITH events AS (
        SELECT l.tx_code AS id, l.created_at AS at, l.delta, l.kind, l.reason, l.ref_type, l.ref_id,
               w.expires_at
        FROM wallet_ledger l
        LEFT JOIN wallet_lots w ON w.id = l.lot_id
        WHERE l.user_id = $1 AND l.currency = 'coin'
        UNION ALL
        SELECT w.expiry_code, w.expires_at, -w.remaining, w.kind, 'expired', 'lot', w.source, w.expires_at
        FROM wallet_lots w
        WHERE w.user_id = $1 AND w.currency = 'coin' AND w.expires_at <= now() AND w.remaining > 0
    ),
    ordered AS (
        SELECT e.*, SUM(e.delta) OVER (ORDER BY e.at, e.id ROWS UNBOUNDED PRECEDING) AS balance
        FROM events e
    )
`;

const FILTER_SQL: Record<TxFilter, string> = {
    all: "true",
    earned: "delta > 0",
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
            return { type: "Top Up", category: "topup", description: "Coins top up" };
        case "unlock":
            return { type: "Unlock", category: "spent", description: "Chapter unlock" };
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
        coinKind: r.kind === "base" ? "coins" : "bonus coins",
        balance: Number(r.balance),
        expiresAt: r.reason !== "expired" && r.expires_at ? new Date(r.expires_at).toISOString() : null,
        reason: r.reason,
        refId: r.ref_id ?? null,
    };
}

// A page of history, newest first. `before` = the last id of the previous page.
export async function listTransactions(userId: string, filter: TxFilter, before?: string | null) {
    const params: any[] = [userId];
    let cursor = "";
    if (before && TX_CODE.test(before)) {
        params.push(before);
        cursor = `AND (at, id) < (SELECT at, id FROM ordered WHERE id = $${params.length})`;
    }
    params.push(TX_PAGE_SIZE + 1);
    const { rows } = await dbPool.query(
        `${EVENTS}
         SELECT * FROM ordered
         WHERE ${FILTER_SQL[filter]} ${cursor}
         ORDER BY at DESC, id DESC
         LIMIT $${params.length}`,
        params
    );
    const hasMore = rows.length > TX_PAGE_SIZE;
    return { transactions: rows.slice(0, TX_PAGE_SIZE).map(toTx), hasMore };
}

// One entry (only the reader's own)
export async function getTransaction(userId: string, id: string): Promise<Transaction | null> {
    if (!TX_CODE.test(id)) return null;
    const { rows } = await dbPool.query(`${EVENTS} SELECT * FROM ordered WHERE id = $2`, [userId, id]);
    return rows[0] ? toTx(rows[0]) : null;
}