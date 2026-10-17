// app/api/auth/google/login/route.ts
// Starts Google sign-in: saves a random state in a short-lived cookie and sends the browser to Google.
// ?next=/some/page is where to come back to afterwards (only paths on this site).
import { NextRequest, NextResponse } from "next/server";
import { AUTH_CONFIG } from "@/lib/auth/authConfig";
import { backTo, googleAuthUrl, newState, setStateCookie } from "@/lib/auth/oauth";

export async function GET(request: NextRequest) {
    const next = request.nextUrl.searchParams.get("next") ?? "/";
    if (!(AUTH_CONFIG.googleClientId && AUTH_CONFIG.googleClientSecret)) {
        console.error("Google sign-in is not set up in");
        return NextResponse.redirect(backTo(request, next, "google_failed"));
    }

    const state = newState(next);
    const response = NextResponse.redirect(googleAuthUrl(request, state));
    setStateCookie(response, "google", state);
    return response;
}