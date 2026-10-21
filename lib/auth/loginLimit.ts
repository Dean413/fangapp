import "server-only";
import { dbPool as db } from "@/lib/db";
import { msg } from "@/lib/i18n";
const WINDOW_MINUTES = 15;
const MAX_IN_WINDOW = 10;
const MAX_PER_DAY = 30;
// Banned and deleted accounts can't sign in. Suspended accounts can, so they can see why.
export const CLOSED_STATUSES = ["banned", "deleted"];
export const isClosedAccount = (status: unknown) => typeof status === "string" && CLOSED_STATUSES.includes(status);
export const CLOSED_MESSAGE = "accountClosed";

// Tries in the last 24 hours / in the last 15 minutes
const DAY = `ARRAY(SELECT t FROM unnest(login_attempts.tries) AS t WHERE t > now() - interval '1 day')`;
const WINDOW = `ARRAY(SELECT t FROM unnest(login_attempts.tries) AS t WHERE t > now() - make_interval(mins => $2))`;

const TAKE_TRY = `
    INSERT INTO login_attempts (email, tries) VALUES ($1, ARRAY[now()])
    ON CONFLICT (email) DO UPDATE SET tries = ${DAY} || now()
    WHERE cardinality(${WINDOW}) < $3
      AND cardinality(${DAY}) < $4
    RETURNING 1`;

// Now and then, clear emails with no tries in the last 24 hours
function tidyOldRows() {
    if (Math.random() > 0.02) return;
    db.query(
        `DELETE FROM login_attempts
         WHERE NOT EXISTS (SELECT 1 FROM unnest(tries) AS t WHERE t > now() - interval '1 day')`
    ).catch((error: unknown) => console.error("login_attempts cleanup failed:", error));
}

// Counts a sign-in try for this email. Returns null if it may go ahead,
// or how many seconds until the next try is allowed.
export async function takeLoginTry(email: string): Promise<null | { waitSeconds: number }> {
    tidyOldRows();

    const { rows } = await db.query(TAKE_TRY, [email, WINDOW_MINUTES, MAX_IN_WINDOW, MAX_PER_DAY]);
    if (rows.length > 0) return null;

    const { rows: wait } = await db.query(
        `SELECT
            CASE WHEN cardinality(${WINDOW}) >= $3
                 THEN EXTRACT(EPOCH FROM ((SELECT min(t) FROM unnest(${WINDOW}) AS t) + make_interval(mins => $2) - now()))::int
                 ELSE 0 END AS window_wait,
            CASE WHEN cardinality(${DAY}) >= $4
                 THEN EXTRACT(EPOCH FROM ((SELECT min(t) FROM unnest(${DAY}) AS t) + interval '1 day' - now()))::int
                 ELSE 0 END AS day_wait
         FROM login_attempts WHERE email = $1`,
        [email, WINDOW_MINUTES, MAX_IN_WINDOW, MAX_PER_DAY]
    );
    const seconds = Math.max(Number(wait[0]?.window_wait ?? 0), Number(wait[0]?.day_wait ?? 0), 60);
    return { waitSeconds: seconds };
}

// After a right password: forget the tries
export async function clearLoginTries(email: string) {
    await db.query(`DELETE FROM login_attempts WHERE email = $1`, [email]);
}

// Message for a locked email
export function lockedMessage(seconds: number) {
    const minutes = Math.ceil(seconds / 60);
    return minutes >= 120 ? msg("lockedHours", { hours: Math.ceil(minutes / 60) }) : msg("lockedMinutes", { minutes });
}