// app/api/auth/facebook/login/route.ts
// Starts Facebook sign-in: saves a random state in a short-lived cookie and sends the browser to Facebook.
// ?next=/some/page is where to come back to afterwards (only paths on this site).
import { NextRequest, NextResponse } from "next/server";
import { AUTH_CONFIG } from "@/lib/auth/authConfig";
import { backTo, facebookAuthUrl, newState, setStateCookie } from "@/lib/auth/oauth";

export async function GET(request: NextRequest) {
    const next = request.nextUrl.searchParams.get("next") ?? "/";
    if (!(AUTH_CONFIG.facebookAppId && AUTH_CONFIG.facebookAppSecret)) {
        console.error("Facebook sign-in is not set up");
        return NextResponse.redirect(backTo(request, next, "facebook_failed"));
    }

    const state = newState(next);
    const response = NextResponse.redirect(facebookAuthUrl(request, state));
    setStateCookie(response, "facebook", state);
    return response;
}