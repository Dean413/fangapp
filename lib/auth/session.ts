// lib/auth/session.ts
// The reader's login, kept in two httpOnly cookies:
//  - fang_access  (30 minutes): checked on its own
//  - fang_refresh (30 days):    used to make a new fang_access; every time, the account is re-read,
//    so a ban, a deleted account or a password reset ends the login within 30 minutes
import "server-only";
import { cookies } from "next/headers";
import { dbPool } from "@/lib/db";
import {
    ACCESS_MINUTES,
    REFRESH_DAYS,
    canUseReaderApp,
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    type TokenUser,
} from "./token"

const ACCESS_COOKIE = "fang_access";
const REFRESH_COOKIE = "fang_refresh";

const baseCookie = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
};

// Signs the account in on this browser (route handlers only)
export async function startSession(user: TokenUser) {
    const store = await cookies();
    store.set(ACCESS_COOKIE, await generateAccessToken(user), { ...baseCookie, maxAge: ACCESS_MINUTES * 60 });
    store.set(REFRESH_COOKIE, await generateRefreshToken(user), { ...baseCookie, maxAge: REFRESH_DAYS * 24 * 60 * 60 });
}

// Signs out on this browser
export async function endSession() {
    try {
        const store = await cookies();
        store.set(ACCESS_COOKIE, "", { ...baseCookie, maxAge: 0 });
        store.set(REFRESH_COOKIE, "", { ...baseCookie, maxAge: 0 });
    } catch {
        // Server components can't change cookies; the next route handler call will
    }
}

// Records that the reader is using the app (at most once every 5 minutes), so the admin shows them as active.
// Never throws: activity tracking must not break sign-in.
function touchLastActive(userId: string) {
    dbPool.query(
        `UPDATE users SET last_active_at = now()
         WHERE id = $1 AND (last_active_at IS NULL OR last_active_at < now() - interval '5 minutes')`,
        [userId]
    ).catch((err: unknown) => console.error("last_active_at update failed:", err));
}

// The account as it is now in the database, for a login renewal
async function loadAccount(userId: string) {
    const { rows } = await dbPool.query(
        `SELECT id, email, role,
                COALESCE(account_status, 'active') IN ('banned', 'deleted') AS closed,
                FLOOR(EXTRACT(EPOCH FROM sessions_valid_after))::bigint AS sessions_valid_after
         FROM users WHERE id = $1`,
        [userId]
    );
    return rows[0] ?? null;
}

// The signed-in account, or null. Renews the 30-minute cookie when needed.
export async function getCurrentUser(): Promise<TokenUser | null> {
    const store = await cookies();

    const access = store.get(ACCESS_COOKIE)?.value;
    if (access) {
        try {
            const claims = await verifyAccessToken(access);
            if (canUseReaderApp(claims.role)) {
                touchLastActive(claims.id);
                return { id: claims.id, email: claims.email, role: claims.role };
            }
        } catch {
            // expired or invalid: try the refresh cookie
        }
    }

    const refresh = store.get(REFRESH_COOKIE)?.value;
    if (!refresh) return null;

    let claims;
    try {
        claims = await verifyRefreshToken(refresh);
    } catch {
        await endSession();
        return null;
    }

    const account = await loadAccount(claims.id);
    const issuedAt = typeof claims.iat === "number" ? claims.iat : 0;
    const ended =
        !account ||
        account.closed ||
        !canUseReaderApp(account.role) ||
        (account.sessions_valid_after != null && issuedAt <= Number(account.sessions_valid_after));
    if (ended) {
        await endSession();
        return null;
    }

    const user: TokenUser = { id: account.id, email: account.email, role: account.role };
    try {
        store.set(ACCESS_COOKIE, await generateAccessToken(user), { ...baseCookie, maxAge: ACCESS_MINUTES * 60 });
    } catch {
        // Server components can't change cookies; the next route handler call will
    }
    touchLastActive(user.id);
    return user;
}