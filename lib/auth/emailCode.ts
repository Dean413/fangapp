import "server-only";
import crypto from "crypto";
import { dbPool as db } from "@/lib/db";
import { withTransaction } from "./transaction";
import { AUTH_CONFIG } from "./authConfig";

export type CodePurpose = "verify_email" | "reset_password";
export type CodeCheck = "ok" | "wrong" | "expired" | "too_many";
export type ResetResult = "ok" | "invalid" | "blocked";

const CODE_MINUTES: Record<CodePurpose, number> = { verify_email: 15, reset_password: 10 };
export const RESET_SESSION_MINUTES = 10;
export const RESET_SESSION_COOKIE_PATH = "/api/auth/reset-password";
const MAX_ATTEMPTS = 5;
const RESEND_AFTER_SECONDS = 60;
const MAX_SENDS_PER_DAY = 10;

// Keyed hash. A 6-digit code has only a million values, so a plain hash could be reversed by anyone
// with a copy of the database; with the key kept outside the database, it can't.
function pepper(): string {
    const value = AUTH_CONFIG.emailCodePepper;
    if (!value) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("emailCodePepper is not set in lib/auth/config.ts");
        }
        return "local-dev-only-email-code-pepper"; // npm run dev only
    }
    return value;
}
const mac = (value: string) => crypto.createHmac("sha256", pepper()).update(value).digest("hex");

const sameMac = (a: string, b: string | null) => {
    if (!b) return false;
    const x = Buffer.from(a, "hex");
    const y = Buffer.from(b, "hex");
    return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
};

// Sends in the last 24 hours, from the send_times list
const RECENT_SENDS = `ARRAY(SELECT t FROM unnest(email_codes.send_times) AS t WHERE t > now() - interval '1 day')`;

// Saves a new code only if the limits allow it. The row is locked while the limits are checked,
// so requests arriving at the same moment can't all slip past them. The code being replaced is kept
// as the previous code until it expires, together with the wrong tries it has already used.
const ISSUE = `
    INSERT INTO email_codes (user_id, purpose, code_hash, attempts, expires_at, sent_at, send_times)
    VALUES ($1, $2, $3, 0, now() + make_interval(mins => $4), now(), ARRAY[now()])
    ON CONFLICT (user_id, purpose) DO UPDATE SET
        prev_code_hash = CASE WHEN email_codes.expires_at > now() THEN email_codes.code_hash END,
        prev_expires_at = CASE WHEN email_codes.expires_at > now() THEN email_codes.expires_at END,
        prev_attempts = CASE WHEN email_codes.expires_at > now() THEN email_codes.attempts END,
        code_hash = EXCLUDED.code_hash,
        attempts = 0,
        expires_at = EXCLUDED.expires_at,
        sent_at = now(),
        send_times = ${RECENT_SENDS} || now()
    WHERE email_codes.sent_at <= now() - make_interval(secs => $5)
      AND cardinality(${RECENT_SENDS}) < $6
    RETURNING 1`;

// Now and then, clear rows that are long expired and have no sends in the last 24 hours
function tidyOldRows() {
    if (Math.random() > 0.02) return;
    db.query(
        `DELETE FROM email_codes
         WHERE expires_at < now() - interval '1 day'
           AND NOT EXISTS (SELECT 1 FROM unnest(send_times) AS t WHERE t > now() - interval '1 day')`
    ).catch((error: unknown) => console.error("email_codes cleanup failed:", error));
}

// Makes a new code for the account and returns it to email.
// If the limits say no (under a minute since the last one, or 10 in the last 24 hours), returns how long
// to wait; the codes already sent still work.
export async function issueCode(userId: string, purpose: CodePurpose): Promise<{ code: string } | { waitSeconds: number }> {
    tidyOldRows();

    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
    const { rows } = await db.query(ISSUE, [userId, purpose, mac(code), CODE_MINUTES[purpose], RESEND_AFTER_SECONDS, MAX_SENDS_PER_DAY]);
    if (rows.length > 0) return { code };

    const { rows: last } = await db.query(
        `SELECT GREATEST($3 - EXTRACT(EPOCH FROM (now() - sent_at))::int, 0) AS cooldown,
                CASE WHEN cardinality(${RECENT_SENDS}) >= $4
                     THEN GREATEST(EXTRACT(EPOCH FROM (
                              (SELECT min(t) FROM unnest(email_codes.send_times) AS t WHERE t > now() - interval '1 day')
                              + interval '1 day' - now()))::int, 60)
                     ELSE 0 END AS daily
         FROM email_codes WHERE user_id = $1 AND purpose = $2`,
        [userId, purpose, RESEND_AFTER_SECONDS, MAX_SENDS_PER_DAY]
    );
    const wait = Math.max(Number(last[0]?.cooldown ?? 0), Number(last[0]?.daily ?? 0), 1);
    return { waitSeconds: wait };
}

// Message for a "wait" answer
export function waitMessage(seconds: number) {
    return seconds > 120
        ? "You've asked for too many codes today. Please try again later."
        : `Please wait ${seconds} seconds before asking for a new code.`;
}

// Makes the account's codes for this purpose unusable, keeping its send history (so limits still apply)
const CANCEL = `
    UPDATE email_codes
    SET code_hash = 'used', prev_code_hash = NULL, prev_expires_at = NULL, prev_attempts = NULL, expires_at = now()
    WHERE user_id = $1 AND purpose = $2`;

// Checks a code against the current code and the previous one (if it hasn't expired).
// Each code has its own count of wrong tries, and a wrong try counts against both (it was wrong for both),
// so every code gets at most 5 tries in total, however many new codes are asked for.
// A right code is used up. The row is locked while it's checked, so tries at the same moment can't get extra guesses.
export async function checkCode(userId: string, purpose: CodePurpose, code: string): Promise<CodeCheck> {
    if (!/^\d{6}$/.test(code)) return "wrong";

    return withTransaction(async (client) => {
        const { rows } = await client.query(
            `SELECT code_hash, attempts, expires_at > now() AS live,
                    prev_code_hash, COALESCE(prev_attempts, $3) AS prev_attempts,
                    COALESCE(prev_expires_at > now(), false) AS prev_live
             FROM email_codes WHERE user_id = $1 AND purpose = $2 FOR UPDATE`,
            [userId, purpose, MAX_ATTEMPTS]
        );
        const row = rows[0];
        if (!row || (!row.live && !row.prev_live)) return "expired" as const;

        const currentOpen = row.live && row.attempts < MAX_ATTEMPTS;
        const previousOpen = row.prev_live && row.prev_attempts < MAX_ATTEMPTS;
        if (!currentOpen && !previousOpen) return "too_many" as const;

        const given = mac(code);
        const right =
            (currentOpen && sameMac(given, row.code_hash)) ||
            (previousOpen && sameMac(given, row.prev_code_hash));

        if (right) {
            await client.query(CANCEL, [userId, purpose]);
            return "ok" as const;
        }

        await client.query(
            `UPDATE email_codes
             SET attempts = attempts + 1,
                 prev_attempts = CASE WHEN prev_attempts IS NULL THEN NULL ELSE prev_attempts + 1 END
             WHERE user_id = $1 AND purpose = $2`,
            [userId, purpose]
        );
        const currentLeft = currentOpen && row.attempts + 1 < MAX_ATTEMPTS;
        const previousLeft = previousOpen && row.prev_attempts + 1 < MAX_ATTEMPTS;
        return currentLeft || previousLeft ? ("wrong" as const) : ("too_many" as const);
    });
}

// Cancels the account's codes for a purpose (e.g. once Google has confirmed the email)
export async function cancelCodes(userId: string, purpose: CodePurpose) {
    await db.query(CANCEL, [userId, purpose]);
}

// After a right reset code: a one-time pass for choosing the new password (goes in an httpOnly cookie)
export async function createResetSession(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString("base64url");
    await db.query(
        `INSERT INTO email_codes (user_id, purpose, code_hash, attempts, expires_at, sent_at)
         VALUES ($1, 'reset_session', $2, 0, now() + make_interval(mins => $3), now())
         ON CONFLICT (user_id, purpose) DO UPDATE SET
             code_hash = EXCLUDED.code_hash, attempts = 0, expires_at = EXCLUDED.expires_at, sent_at = now(),
             prev_code_hash = NULL, prev_expires_at = NULL, prev_attempts = NULL`,
        [userId, mac(token), RESET_SESSION_MINUTES]
    );
    return token;
}

// Sets the new password with a reset pass, in one transaction: the pass is used up only if the
// password really changes. passwordHash must already be hashed (do the slow hashing before calling).
// Logins made before now stop working the next time they renew (within 30 minutes).
// Banned and deleted accounts can't reset; suspended accounts can.
export async function resetPasswordWithSession(token: string | undefined, passwordHash: string): Promise<ResetResult> {
    if (!token || token.length > 100) return "invalid";

    try {
        return await withTransaction(async (client) => {
            const { rows } = await client.query(
                `DELETE FROM email_codes
                 WHERE purpose = 'reset_session' AND code_hash = $1 AND expires_at > now()
                 RETURNING user_id`,
                [mac(token)]
            );
            const userId = rows[0]?.user_id;
            if (!userId) return "invalid" as const;

            const { rows: changed } = await client.query(
                `UPDATE users
                 SET password_hash = $2,
                     email_verified_at = COALESCE(email_verified_at, now()),
                     sessions_valid_after = now()
                 WHERE id = $1 AND COALESCE(account_status, 'active') NOT IN ('banned', 'deleted')
                 RETURNING email`,
                [userId, passwordHash]
            );
            // Banned or deleted: undo everything, including using up the pass
            if (!changed[0]) throw new Error("ACCOUNT_BLOCKED");

            await client.query(CANCEL, [userId, "reset_password"]);
            await client.query(`DELETE FROM login_attempts WHERE email = lower($1)`, [changed[0].email]);
            // The email's owner has now proved it: drop sign-in links (e.g. Facebook) whose email was never verified
            await client.query(`DELETE FROM user_identities WHERE user_id = $1 AND NOT email_verified`, [userId]);
            return "ok" as const;
        });
    } catch (error) {
        if (error instanceof Error && error.message === "ACCOUNT_BLOCKED") return "blocked";
        throw error;
    }
}