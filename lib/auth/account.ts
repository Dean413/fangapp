// lib/auth/accounts.ts
// Creating reader accounts, and signing in with Google or Facebook.
//
// Google (and Apple) confirm the person owns the email, so:
//  - a new email gets a confirmed account
//  - an existing account is signed in and linked; if its email was never confirmed, it's confirmed now and
//    its password is removed, because whoever set that password never proved they own the email
// Facebook does NOT promise the email is confirmed, so:
//  - a new email gets an account whose email stays unconfirmed (Forgot Password can confirm it later)
//  - an email that already has an account is never taken over: the reader is asked to sign in the usual way
//  - a Facebook link stops working once someone proves they own the email (code or password reset)
import "server-only";
import crypto from "crypto";
import type { PoolClient } from "pg";
import { withTransaction } from "@/lib/auth/transaction";
import { grantSignupBonusSafely } from "@/lib/wallet";
import { cancelCodes } from "@/lib/auth/emailCode";
import { isClosedAccount, CLOSED_MESSAGE } from "@/lib/auth/loginLimit";
import { canUseReaderApp, type TokenUser } from "@/lib/auth/token";
import { AUTH_CONFIG } from "@/lib/auth/authConfig";

export type Provider = "google" | "facebook";

export type ProviderProfile = {
    provider: Provider;
    providerUserId: string;
    email: string;
    emailVerified: boolean;
    name: string;
};

export type ProviderResult =
    | { ok: true; user: TokenUser; isNew: boolean }
    | { ok: false; code: "ACCOUNT_CLOSED" | "NOT_ALLOWED" | "EMAIL_EXISTS" | "LINK_EXPIRED"; message: string };

export const cleanName = (value: unknown) =>
    typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 60) : "";

// A public ID like FR48203917 that isn't taken yet (by a reader or a writer)
export async function newPublicId(client: PoolClient): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
        const id = `${AUTH_CONFIG.publicIdPrefix}${crypto.randomInt(10_000_000, 100_000_000)}`;
        const { rowCount } = await client.query(
            `SELECT 1 FROM reader_profiles WHERE public_id = $1
             UNION ALL SELECT 1 FROM user_profiles WHERE public_id = $1
             LIMIT 1`,
            [id]
        );
        if (!rowCount) return id;
    }
    throw new Error("Could not find a free public ID");
}

// The reader profile (one per account, in reader_profiles; writers' user_profiles are never touched)
export async function createReaderProfile(client: PoolClient, userId: string, fullName: string) {
    await client.query(
        `INSERT INTO reader_profiles (user_id, public_id, full_name) VALUES ($1, $2, $3)`,
        [userId, await newPublicId(client), cleanName(fullName)]
    );
}

// Makes the reader profile if the account doesn't have one yet (e.g. a writer reading for the first time).
// A writer's reader profile starts with the name from their writer profile; their username stays empty.
async function ensureReaderProfile(client: PoolClient, userId: string, fullName: string) {
    const { rowCount } = await client.query(`SELECT 1 FROM reader_profiles WHERE user_id = $1`, [userId]);
    if (rowCount) return;

    let name = cleanName(fullName);
    if (!name) {
        const { rows } = await client.query(
            `SELECT full_name FROM user_profiles WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [userId]
        );
        name = cleanName(rows[0]?.full_name);
    }
    await client.query(
        `INSERT INTO reader_profiles (user_id, public_id, full_name) VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, await newPublicId(client), name]
    );
}

// After every successful sign-in: make sure the reader profile exists and give the sign-up bonus (once).
// Never blocks the sign-in if something goes wrong.
export async function prepareReader(userId: string) {
    try {
        await withTransaction((client) => ensureReaderProfile(client, userId, ""));
    } catch (error) {
        console.error("Reader profile setup failed:", error);
    }
    await grantSignupBonusSafely(userId);
}

const closed = (): ProviderResult => ({ ok: false, code: "ACCOUNT_CLOSED", message: CLOSED_MESSAGE });
const notAllowed = (): ProviderResult => ({ ok: false, code: "NOT_ALLOWED", message: "This account can't be used to sign in here." });

export async function signInWithProvider(p: ProviderProfile): Promise<ProviderResult> {
    const email = p.email.trim().toLowerCase();
    const name = cleanName(p.name);

    const result = await withTransaction(async (client): Promise<ProviderResult & { cancelVerify?: string }> => {
        // 1. Already linked to an account
        const { rows: linked } = await client.query(
            `SELECT i.email_verified, u.id, u.email, u.role, u.account_status, u.email_verified_at
             FROM user_identities i JOIN users u ON u.id = i.user_id
             WHERE i.provider = $1 AND i.provider_user_id = $2
             FOR UPDATE OF u`,
            [p.provider, p.providerUserId]
        );
        if (linked[0]) {
            const u = linked[0];
            // A link made with an unconfirmed email stops working once the email's owner has confirmed it
            if (!u.email_verified && u.email_verified_at) {
                await client.query(`DELETE FROM user_identities WHERE provider = $1 AND provider_user_id = $2`, [p.provider, p.providerUserId]);
                return { ok: false, code: "LINK_EXPIRED", message: "Please sign in with your email and password." };
            }
            if (isClosedAccount(u.account_status)) return closed();
            if (!canUseReaderApp(u.role)) return notAllowed();
            return { ok: true, user: { id: u.id, email: u.email, role: u.role }, isNew: false };
        }

        // 2. An account with this email already exists
        const { rows: existing } = await client.query(
            `SELECT id, email, role, account_status, email_verified_at FROM users WHERE email = $1 FOR UPDATE`,
            [email]
        );
        if (existing[0]) {
            const u = existing[0];
            if (!p.emailVerified) {
                return {
                    ok: false,
                    code: "EMAIL_EXISTS",
                    message: "An account with this email already exists. Sign in with your email and password or Google.",
                };
            }
            if (isClosedAccount(u.account_status)) return closed();
            if (!canUseReaderApp(u.role)) return notAllowed();

            let cancelVerify: string | undefined;
            if (!u.email_verified_at) {
                // Never confirmed: confirm it now and remove the password nobody proved they own
                await client.query(
                    `UPDATE users SET email_verified_at = now(), password_hash = NULL WHERE id = $1 AND email_verified_at IS NULL`,
                    [u.id]
                );
                cancelVerify = u.id;
            }
            await client.query(
                `INSERT INTO user_identities (provider, provider_user_id, user_id, email, email_verified)
                 VALUES ($1, $2, $3, $4, true)
                 ON CONFLICT (provider, provider_user_id) DO NOTHING`,
                [p.provider, p.providerUserId, u.id, email]
            );
            await ensureReaderProfile(client, u.id, name);
            return { ok: true, user: { id: u.id, email: u.email, role: u.role }, isNew: false, cancelVerify };
        }

        // 3. New account
        const { rows: created } = await client.query(
            `INSERT INTO users (email, password_hash, role, email_verified_at)
             VALUES ($1, NULL, 'reader', CASE WHEN $2::boolean THEN now() END)
             RETURNING id, email, role`,
            [email, p.emailVerified]
        );
        const u = created[0];
        await client.query(
            `INSERT INTO user_identities (provider, provider_user_id, user_id, email, email_verified)
             VALUES ($1, $2, $3, $4, $5)`,
            [p.provider, p.providerUserId, u.id, email, p.emailVerified]
        );
        await createReaderProfile(client, u.id, name);
        return { ok: true, user: { id: u.id, email: u.email, role: u.role }, isNew: true };
    });

    if (result.ok && result.cancelVerify) {
        await cancelCodes(result.cancelVerify, "verify_email");
    }
    if (result.ok) return { ok: true, user: result.user, isNew: result.isNew };
    return result;
}