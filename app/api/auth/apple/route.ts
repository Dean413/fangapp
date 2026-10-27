// Apple popup sign-in: the browser sends Apple's ID token, verified here, then the same sign-in / link flow as Google.
import { NextRequest, NextResponse } from "next/server";
import { AUTH_CONFIG } from "@/lib/auth/authConfig";
import { verifyAppleToken } from "@/lib/auth/apple";
import { prepareReader, signInWithProvider } from "@/lib/auth/account";
import { getCurrentUser, startSession } from "@/lib/auth/session";
import { linkProvider } from "@/lib/settings";
import { logError } from "@/lib/log";

const fail = (code: string, status = 400) => NextResponse.json({ code }, { status });

// The Services ID and return URL are public; the page asks for them
export async function GET(request: NextRequest) {
    return NextResponse.json({
        clientId: AUTH_CONFIG.appleClientID,
        redirectUri: AUTH_CONFIG.appleRedirectUri || request.nextUrl.origin,
    });
}

export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => null);
    const idToken = body?.idToken;
    if (typeof idToken !== "string" || !idToken) return fail("apple_failed");
    const fullName = typeof body?.fullName === "string" ? body.fullName.trim().slice(0, 100) : "";

    try {
        const profile = await verifyAppleToken(idToken, fullName);

        if (body?.link === true) {
            const current = await getCurrentUser();
            if (!current) return fail("link_signin", 401);
            const linked = await linkProvider(current.id, "apple", profile.providerUserId, profile.email);
            return linked === "ok" ? NextResponse.json({ ok: true }) : fail("linked_elsewhere", 409);
        }

        const result = await signInWithProvider(profile);
        if (!result.ok) return fail(result.code.toLowerCase(), 403);

        await startSession(result.user);
        await prepareReader(result.user.id);
        return NextResponse.json({ ok: true });
    } catch (error) {
        logError("Apple sign-in error:", error);
        const noEmail = error instanceof Error && error.message === "APPLE_NO_EMAIL";
        return fail(noEmail ? "apple_no_email" : "apple_failed", 401);
    }
}