// lib/auth/accountState.ts
// One rule for "is this account suspended right now", used everywhere on the reader site.
// A suspension ends by itself on users.suspended_until (NULL = no end date, so permanent). The admin works the
// same way and nothing resets account_status when the date passes, so the date must always be checked.
import "server-only";
import { dbPool } from "@/lib/db";
import { reply } from "@/lib/auth/rules";
import { logError } from "@/lib/log";

// SQL for the account's status right now, for a users table with this alias:
// a suspension whose end date has passed counts as "active" again
export const statusNow = (u: string) => `(CASE
    WHEN ${u}.account_status = 'suspended' AND ${u}.suspended_until IS NOT NULL AND ${u}.suspended_until <= now() THEN 'active'
    ELSE COALESCE(${u}.account_status, 'active')
END)`;

export type AccountState = {
    status: "active" | "suspended" | "banned" | "deleted";
    suspendedUntil: string | null; // ISO date; null = permanent (only while suspended)
    reason: string | null; // the reason picked in the admin (only while suspended)
};

// The account's state right now, for the suspension notice. A suspension that has run out reads as "active".
export async function getAccountState(userId: string): Promise<AccountState> {
    const { rows } = await dbPool.query(
        `SELECT ${statusNow("u")} AS status, u.suspended_until FROM users u WHERE u.id = $1`,
        [userId]
    );
    const user = rows[0];
    if (!user) return { status: "deleted", suspendedUntil: null, reason: null };
    if (user.status !== "suspended") return { status: user.status, suspendedUntil: null, reason: null };

    // The reason is a nice extra: if it can't be read, the notice still shows without it
    let reason: string | null = null;
    try {
        const { rows: actions } = await dbPool.query(
            `SELECT reason FROM account_actions WHERE user_id = $1 AND action = 'suspend' ORDER BY created_at DESC LIMIT 1`,
            [userId]
        );
        reason = actions[0]?.reason ?? null;
    } catch (error) {
        logError("Suspension reason lookup failed:", error);
    }
    return {
        status: "suspended",
        suspendedUntil: user.suspended_until ? new Date(user.suspended_until).toISOString() : null,
        reason,
    };
}

// True when the account may post, like, vote and so on (active, or a suspension that has ended)
export async function canWrite(userId: string): Promise<boolean> {
    const { rows } = await dbPool.query(`SELECT ${statusNow("u")} AS status FROM users u WHERE u.id = $1`, [userId]);
    return rows[0]?.status === "active";
}

// For routes: null when the reader may go ahead, otherwise the 403 answer to return
export async function suspendedReply(userId: string) {
    return (await canWrite(userId)) ? null : reply(403, "cantPost");
}