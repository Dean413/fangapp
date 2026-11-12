// lib/auth/appTicket.ts
// Google / Facebook sign-in for the mobile app.
// The app opens /api/auth/<provider>/login?app=1 in the phone's browser. That sets a small "app" cookie,
// and the provider's callback then, instead of signing the BROWSER in, makes a one-time ticket and sends
// the browser to fangapp://oauth?ticket=... The app trades the ticket at /api/auth/app-ticket, which signs
// the APP in (its own cookies). A ticket lasts 2 minutes and works once; only its hash is stored.
import "server-only";
import crypto from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import type { Provider } from "@/lib/auth/account";

export const APP_RETURN_URL = "fangapp://oauth"; // the app's scheme ("scheme" in the app's app.json)
const TICKET_MINUTES = 2;

const cookieName = (provider: Provider) => `oauth_app_${provider}`;
const hash = (ticket: string) => crypto.createHash("sha256").update(ticket).digest("hex");

export function setAppCookie(response: NextResponse, provider: Provider) {
    response.cookies.set(cookieName(provider), "1", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: `/api/auth/${provider}`,
        maxAge: 10 * 60,
    });
}

export const isAppSignIn = (request: NextRequest, provider: Provider) => request.cookies.get(cookieName(provider))?.value === "1";

export function clearAppCookie(response: NextResponse, provider: Provider) {
    response.cookies.set(cookieName(provider), "", { path: `/api/auth/${provider}`, maxAge: 0 });
}

// Where the browser goes at the end: back into the app with a ticket, or with ?auth_error=<code>
export function appReturn(result: { ticket: string } | { error: string }) {
    const url = new URL(APP_RETURN_URL);
    if ("ticket" in result) url.searchParams.set("ticket", result.ticket);
    else url.searchParams.set("auth_error", result.error);
    return url;
}

export async function createAppTicket(userId: string, provider: Provider): Promise<string> {
    const ticket = crypto.randomBytes(32).toString("base64url");
    await dbPool.query(
        `INSERT INTO app_login_tickets (token_hash, user_id, provider, expires_at)
         VALUES ($1, $2, $3, now() + make_interval(mins => $4))`,
        [hash(ticket), userId, provider, TICKET_MINUTES]
    );
    // Old tickets are cleaned up now and then
    if (Math.random() < 0.05) dbPool.query(`DELETE FROM app_login_tickets WHERE expires_at < now() - interval '1 day'`).catch(() => { });
    return ticket;
}

// Uses a ticket (once). Returns the account to sign in, or null if it's wrong, used or expired.
export async function redeemAppTicket(ticket: string): Promise<{ id: string; email: string; role: string; provider: string } | null> {
    if (!/^[A-Za-z0-9_-]{20,100}$/.test(ticket)) return null;
    const { rows } = await dbPool.query(
        `UPDATE app_login_tickets t SET used_at = now()
         FROM users u
         WHERE t.token_hash = $1 AND t.used_at IS NULL AND t.expires_at > now() AND u.id = t.user_id
         RETURNING u.id, u.email, u.role, t.provider`,
        [hash(ticket)]
    );
    return rows[0] ?? null;
}