// lib/settings.ts
// Account settings for signed-in readers: password, two-factor sign-in, email change, sign-in links
// (Google / Facebook), notification switches and deleting the account.
// Every change that needs proof asks for the current password (or an email code when the account has none).
// Wrong passwords here count towards the same sign-in limit as the sign-in page.
/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { dbPool } from "@/lib/db";
import { withTransaction } from "@/lib/auth/transaction";
import { comparePassword } from "@/lib/auth/token";
import { clearLoginTries, takeLoginTry } from "@/lib/auth/loginLimit";

export type Provider = "google" | "facebook";
export const PROVIDERS: Provider[] = ["google", "facebook"];

export type NotificationSettings = {
    newChapters: boolean;
    rewards: boolean;
    replies: boolean;
    emailUpdates: boolean;
};

const DEFAULT_NOTIFICATIONS: NotificationSettings = { newChapters: true, rewards: true, replies: true, emailUpdates: false };

export type AccountSettings = {
    email: string;
    username: string | null;
    joinedAt: string | null;
    hasPassword: boolean;
    passwordChangedAt: string | null;
    twoFactor: boolean;
    isWriter: boolean;            // the account is also a FangWriters account
    providers: Record<Provider, boolean>;
    notifications: NotificationSettings;
};

export async function getAccountSettings(userId: string): Promise<AccountSettings | null> {
    const { rows } = await dbPool.query(
        `SELECT u.email, u.role, (u.password_hash IS NOT NULL) AS has_password, u.password_changed_at,
                u.two_factor_enabled, COALESCE(r.created_at, u.created_at) AS joined_at, r.username,
                COALESCE(ARRAY(SELECT i.provider FROM user_identities i WHERE i.user_id = u.id), '{}') AS providers,
                s.notify_new_chapters, s.notify_rewards, s.notify_replies, s.email_updates
         FROM users u
         LEFT JOIN reader_profiles r ON r.user_id = u.id
         LEFT JOIN reader_settings s ON s.user_id = u.id
         WHERE u.id = $1`,
        [userId]
    );
    const r = rows[0];
    if (!r) return null;
    const linked: string[] = Array.isArray(r.providers) ? r.providers : [];
    return {
        email: r.email,
        username: r.username ?? null,
        joinedAt: r.joined_at ? new Date(r.joined_at).toISOString() : null,
        hasPassword: r.has_password === true,
        passwordChangedAt: r.password_changed_at ? new Date(r.password_changed_at).toISOString() : null,
        twoFactor: r.two_factor_enabled === true,
        isWriter: r.role === "author",
        providers: { google: linked.includes("google"), facebook: linked.includes("facebook") },
        notifications: r.notify_new_chapters == null
            ? DEFAULT_NOTIFICATIONS
            : {
                newChapters: r.notify_new_chapters,
                rewards: r.notify_rewards,
                replies: r.notify_replies,
                emailUpdates: r.email_updates,
            },
    };
}

export type PasswordCheck = "ok" | "wrong" | "none" | { waitSeconds: number };

// Checks the account's current password. Wrong tries count towards the sign-in limit for this email.
export async function checkCurrentPassword(userId: string, password: unknown): Promise<PasswordCheck> {
    const { rows } = await dbPool.query(`SELECT email, password_hash FROM users WHERE id = $1`, [userId]);
    const u = rows[0];
    if (!u?.password_hash) return "none";
    if (typeof password !== "string" || !password || password.length > 1024) return "wrong";

    const locked = await takeLoginTry(u.email);
    if (locked) return { waitSeconds: locked.waitSeconds };
    const ok = await comparePassword(password, u.password_hash);
    if (!ok) return "wrong";
    await clearLoginTries(u.email);
    return "ok";
}

// Sets a new password (hash already made). Signs the account out on every other device:
// logins made before now stop working when they renew; the caller starts a fresh login on this browser.
export async function setPassword(userId: string, passwordHash: string) {
    await dbPool.query(
        `UPDATE users SET password_hash = $2, password_changed_at = now(), sessions_valid_after = now() - interval '1 second' WHERE id = $1`,
        [userId, passwordHash]
    );
}

export async function setTwoFactor(userId: string, enabled: boolean) {
    await dbPool.query(`UPDATE users SET two_factor_enabled = $2 WHERE id = $1`, [userId, enabled]);
}

export async function saveNotifications(userId: string, n: NotificationSettings) {
    await dbPool.query(
        `INSERT INTO reader_settings (user_id, notify_new_chapters, notify_rewards, notify_replies, email_updates, updated_at)
         VALUES ($1, $2, $3, $4, $5, now())
         ON CONFLICT (user_id) DO UPDATE SET
             notify_new_chapters = EXCLUDED.notify_new_chapters,
             notify_rewards = EXCLUDED.notify_rewards,
             notify_replies = EXCLUDED.notify_replies,
             email_updates = EXCLUDED.email_updates,
             updated_at = now()`,
        [userId, n.newChapters, n.rewards, n.replies, n.emailUpdates]
    );
}

// ---------- Email change ----------

export type EmailStart = "ok" | "same" | "taken";

// Saves the new address waiting for its code. Taken addresses are refused.
export async function startEmailChange(userId: string, newEmail: string): Promise<EmailStart> {
    const { rows } = await dbPool.query(`SELECT id FROM users WHERE lower(email) = $1`, [newEmail]);
    if (rows[0]) return rows[0].id === userId ? "same" : "taken";
    await dbPool.query(
        `INSERT INTO email_change_requests (user_id, new_email, created_at) VALUES ($1, $2, now())
         ON CONFLICT (user_id) DO UPDATE SET new_email = EXCLUDED.new_email, created_at = now()`,
        [userId, newEmail]
    );
    return "ok";
}

export async function getPendingEmail(userId: string): Promise<string | null> {
    const { rows } = await dbPool.query(
        `SELECT new_email FROM email_change_requests WHERE user_id = $1 AND created_at > now() - interval '30 minutes'`,
        [userId]
    );
    return rows[0]?.new_email ?? null;
}

export type EmailFinish = { ok: true; oldEmail: string; newEmail: string } | { ok: false; reason: "none" | "taken" };

// After a right code: switches the account to the new address (one transaction)
export async function finishEmailChange(userId: string): Promise<EmailFinish> {
    try {
        return await withTransaction(async (client) => {
            const { rows } = await client.query(
                `DELETE FROM email_change_requests WHERE user_id = $1 AND created_at > now() - interval '30 minutes'
                 RETURNING new_email`,
                [userId]
            );
            const newEmail: string | undefined = rows[0]?.new_email;
            if (!newEmail) return { ok: false, reason: "none" } as const;

            const { rows: taken } = await client.query(`SELECT 1 FROM users WHERE lower(email) = $1 AND id <> $2`, [newEmail, userId]);
            if (taken[0]) return { ok: false, reason: "taken" } as const;

            const { rows: old } = await client.query(`SELECT email FROM users WHERE id = $1 FOR UPDATE`, [userId]);
            await client.query(
                `UPDATE users SET email = $2, email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $1`,
                [userId, newEmail]
            );
            // Sign-in links made with an email nobody proved (e.g. Facebook) stop working
            await client.query(`DELETE FROM user_identities WHERE user_id = $1 AND NOT email_verified`, [userId]);
            return { ok: true, oldEmail: old[0].email as string, newEmail } as const;
        });
    } catch (error) {
        // Someone took the address at the same moment
        if (error instanceof Error && "code" in error && (error as { code?: string }).code === "23505") {
            return { ok: false, reason: "taken" };
        }
        throw error;
    }
}

// ---------- Google / Facebook ----------

export type Unlink = "ok" | "not_linked" | "last_way_in";

// Removes a sign-in link, unless it's the only way left to get into the account
export async function unlinkProvider(userId: string, provider: Provider): Promise<Unlink> {
    return withTransaction(async (client) => {
        const { rows } = await client.query(
            `SELECT (u.password_hash IS NOT NULL) AS has_password,
                    COALESCE(ARRAY(SELECT i.provider FROM user_identities i WHERE i.user_id = u.id), '{}') AS providers
             FROM users u WHERE u.id = $1 FOR UPDATE`,
            [userId]
        );
        const r = rows[0];
        const linked: string[] = Array.isArray(r?.providers) ? r.providers : [];
        if (!linked.includes(provider)) return "not_linked" as const;
        const otherWays = (r.has_password ? 1 : 0) + linked.filter((p) => p !== provider).length;
        if (otherWays === 0) return "last_way_in" as const;
        await client.query(`DELETE FROM user_identities WHERE user_id = $1 AND provider = $2`, [userId, provider]);
        return "ok" as const;
    });
}

export type Link = "ok" | "linked_elsewhere";

// Links a Google / Facebook account to the signed-in account (from the settings page)
export async function linkProvider(userId: string, provider: Provider, providerUserId: string, email: string): Promise<Link> {
    return withTransaction(async (client) => {
        const { rows } = await client.query(
            `SELECT user_id FROM user_identities WHERE provider = $1 AND provider_user_id = $2 FOR UPDATE`,
            [provider, providerUserId]
        );
        if (rows[0]) return rows[0].user_id === userId ? ("ok" as const) : ("linked_elsewhere" as const);
        // One account of each provider per reader: a new one replaces the old link
        await client.query(`DELETE FROM user_identities WHERE user_id = $1 AND provider = $2`, [userId, provider]);
        // The reader is signed in and chose to link it, so the link is trusted
        await client.query(
            `INSERT INTO user_identities (provider, provider_user_id, user_id, email, email_verified)
             VALUES ($1, $2, $3, $4, true)`,
            [provider, providerUserId, userId, email.trim().toLowerCase()]
        );
        return "ok" as const;
    });
}

// ---------- Delete ----------

// Closes the account: marked deleted, signed out everywhere, profile cleared (the username becomes free).
// The wallet history stays (it's permanent). Writers' accounts can't be deleted here.
export async function deleteAccount(userId: string): Promise<"ok" | "writer"> {
    return withTransaction(async (client) => {
        const { rows } = await client.query(`SELECT role FROM users WHERE id = $1 FOR UPDATE`, [userId]);
        if (rows[0]?.role === "author") return "writer" as const;
        await client.query(
            `UPDATE users SET account_status = 'deleted', sessions_valid_after = now(), two_factor_enabled = false WHERE id = $1`,
            [userId]
        );
        await client.query(`DELETE FROM user_identities WHERE user_id = $1`, [userId]);
        await client.query(
            `UPDATE reader_profiles SET username = NULL, bio = NULL, avatar_url = NULL, cover_url = NULL, updated_at = now() WHERE user_id = $1`,
            [userId]
        );
        await client.query(`DELETE FROM reader_favorite_genres WHERE user_id = $1`, [userId]);
        await client.query(`DELETE FROM reader_library WHERE user_id = $1`, [userId]);
        await client.query(`DELETE FROM reading_progress WHERE user_id = $1`, [userId]);
        return "ok" as const;
    });
}