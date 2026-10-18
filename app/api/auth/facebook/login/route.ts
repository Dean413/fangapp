// app/api/auth/facebook/login/route.ts
// Starts Facebook sign-in: saves a random state in a short-lived cookie and sends the browser to Facebook.
// ?next=/some/page is where to come back to afterwards (only paths on this site).
// ?link=1 (from Settings): connect this Facebook account to the signed-in account instead of signing in.
import { NextRequest, NextResponse } from "next/server";
import { AUTH_CONFIG } from "@/lib/auth/authConfig";
import { getCurrentUser } from "@/lib/auth/session";
import { backTo, facebookAuthUrl, newState, setStateCookie } from "@/lib/auth/oauth";

export async function GET(request: NextRequest) {
    const next = request.nextUrl.searchParams.get("next") ?? "/";
    if (!(AUTH_CONFIG.facebookAppId && AUTH_CONFIG.facebookAppSecret)) {
        console.error("Facebook sign-in is not set up in lib/auth/config.ts");
        return NextResponse.redirect(backTo(request, next, "facebook_failed"));
    }

    const link = request.nextUrl.searchParams.get("link") === "1";
    if (link && !(await getCurrentUser())) return NextResponse.redirect(backTo(request, next, "link_signin"));

    const state = newState(next, link ? "link" : "signin");
    const response = NextResponse.redirect(facebookAuthUrl(request, state));
    setStateCookie(response, "facebook", state);
    return response;
}