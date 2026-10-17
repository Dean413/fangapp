import "server-only";
import crypto from "crypto";
import * as jose from "jose";
import type { NextRequest, NextResponse } from "next/server";
import { AUTH_CONFIG } from "./authConfig";
import type { Provider, ProviderProfile } from "./account";

const STATE_MINUTES = 10;
const FB_VERSION = "v21.0";

const cookieName = (provider: Provider) => `oauth_${provider}`;
const cookiePath = (provider: Provider) => `/api/auth/${provider}`;

// Only paths on this site, so the sign-in can't be used to send people to another site
export function safeNext(next: string | null | undefined): string {
    if (!next || next.length > 512) return "/";
    if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
    return next;
}

export function siteUrl(request: NextRequest) {
    return (AUTH_CONFIG.siteUrl || request.nextUrl.origin).replace(/\/+$/, "");
}

export const callbackUrl = (request: NextRequest, provider: Provider) => `${siteUrl(request)}/api/auth/${provider}/callback`;

// Where to send the browser after sign-in; adds ?auth_error=<code> when it failed
export function backTo(request: NextRequest, next: string, error?: string) {
    const url = new URL(safeNext(next), siteUrl(request));
    url.searchParams.delete("auth_error");
    if (error) url.searchParams.set("auth_error", error);
    return url;
}

const base64url = (buf: Buffer) => buf.toString("base64url");

type StateCookie = { state: string; verifier: string; next: string };

export function setStateCookie(response: NextResponse, provider: Provider, value: StateCookie) {
    response.cookies.set(cookieName(provider), JSON.stringify(value), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax", // must come back with the provider's redirect
        path: cookiePath(provider),
        maxAge: STATE_MINUTES * 60,
    });
}

export function clearStateCookie(response: NextResponse, provider: Provider) {
    response.cookies.set(cookieName(provider), "", { path: cookiePath(provider), maxAge: 0 });
}

// The saved state if it matches the one that came back, otherwise null
export function readState(request: NextRequest, provider: Provider): StateCookie | null {
    const raw = request.cookies.get(cookieName(provider))?.value;
    const returned = request.nextUrl.searchParams.get("state") ?? "";
    if (!raw || !returned) return null;
    try {
        const saved = JSON.parse(raw) as StateCookie;
        const a = Buffer.from(saved.state ?? "");
        const b = Buffer.from(returned);
        if (a.length === 0 || a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
        return { state: saved.state, verifier: saved.verifier ?? "", next: safeNext(saved.next) };
    } catch {
        return null;
    }
}

export function newState(next: string): StateCookie {
    return { state: base64url(crypto.randomBytes(32)), verifier: base64url(crypto.randomBytes(48)), next: safeNext(next) };
}

// ---------- Google ----------

export function googleAuthUrl(request: NextRequest, s: StateCookie) {
    const challenge = base64url(crypto.createHash("sha256").update(s.verifier).digest());
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", AUTH_CONFIG.googleClientId);
    url.searchParams.set("redirect_uri", callbackUrl(request, "google"));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", s.state);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("prompt", "select_account");
    return url;
}

let googleJWKS: ReturnType<typeof jose.createRemoteJWKSet> | null = null;
const getGoogleJWKS = () =>
(googleJWKS ??= jose.createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"), {
    timeoutDuration: 15000,
    cooldownDuration: 30000,
}));

export async function googleProfile(request: NextRequest, code: string, verifier: string): Promise<ProviderProfile> {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: AUTH_CONFIG.googleClientId,
            client_secret: AUTH_CONFIG.googleClientSecret,
            redirect_uri: callbackUrl(request, "google"),
            grant_type: "authorization_code",
            code_verifier: verifier,
        }),
    });
    if (!tokenRes.ok) throw new Error(`Google token exchange failed: ${await tokenRes.text()}`);
    const { id_token } = await tokenRes.json();
    if (typeof id_token !== "string") throw new Error("Google did not return an ID token");

    const { payload } = await jose.jwtVerify(id_token, getGoogleJWKS(), {
        issuer: ["accounts.google.com", "https://accounts.google.com"],
        audience: AUTH_CONFIG.googleClientId,
    });
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") throw new Error("Google profile incomplete");
    if (payload.email_verified !== true) throw new Error("GOOGLE_EMAIL_NOT_VERIFIED");

    return {
        provider: "google",
        providerUserId: payload.sub,
        email: payload.email,
        emailVerified: true,
        name: typeof payload.name === "string" ? payload.name : "",
    };
}

// ---------- Facebook ----------

export function facebookAuthUrl(request: NextRequest, s: StateCookie) {
    const url = new URL(`https://www.facebook.com/${FB_VERSION}/dialog/oauth`);
    url.searchParams.set("client_id", AUTH_CONFIG.facebookAppId);
    url.searchParams.set("redirect_uri", callbackUrl(request, "facebook"));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "email,public_profile");
    url.searchParams.set("state", s.state);
    return url;
}

export async function facebookProfile(request: NextRequest, code: string): Promise<ProviderProfile> {
    const tokenUrl = new URL(`https://graph.facebook.com/${FB_VERSION}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", AUTH_CONFIG.facebookAppId);
    tokenUrl.searchParams.set("client_secret", AUTH_CONFIG.facebookAppSecret);
    tokenUrl.searchParams.set("redirect_uri", callbackUrl(request, "facebook"));
    tokenUrl.searchParams.set("code", code);
    const tokenRes = await fetch(tokenUrl);
    if (!tokenRes.ok) throw new Error(`Facebook token exchange failed: ${await tokenRes.text()}`);
    const { access_token } = await tokenRes.json();
    if (typeof access_token !== "string") throw new Error("Facebook did not return an access token");

    // appsecret_proof proves the request comes from this server, not from someone holding the token
    const proof = crypto.createHmac("sha256", AUTH_CONFIG.facebookAppSecret).update(access_token).digest("hex");
    const meUrl = new URL(`https://graph.facebook.com/${FB_VERSION}/me`);
    meUrl.searchParams.set("fields", "id,name,email");
    meUrl.searchParams.set("access_token", access_token);
    meUrl.searchParams.set("appsecret_proof", proof);
    const meRes = await fetch(meUrl);
    if (!meRes.ok) throw new Error(`Facebook profile failed: ${await meRes.text()}`);
    const me = await meRes.json();

    if (typeof me.id !== "string") throw new Error("Facebook profile incomplete");
    if (typeof me.email !== "string" || !me.email) throw new Error("FACEBOOK_NO_EMAIL");

    return {
        provider: "facebook",
        providerUserId: me.id,
        email: me.email,
        emailVerified: false, // Facebook doesn't promise the email is confirmed
        name: typeof me.name === "string" ? me.name : "",
    };
}