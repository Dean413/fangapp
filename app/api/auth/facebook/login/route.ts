// app/api/auth/facebook/login/route.ts
// Starts Facebook sign-in: saves a random state in a short-lived cookie and sends the browser to Facebook.
// ?next=/some/page is where to come back to afterwards (only paths on this site).
// ?link=1 (from Settings): connect this Facebook account to the signed-in account instead of signing in.
// ?app=1 (from the mobile app): at the end, the browser goes back into the app with a one-time ticket (lib/auth/appTicket.ts).
import { NextRequest, NextResponse } from "next/server";
import { AUTH_CONFIG } from "@/lib/auth/authConfig";
import { getCurrentUser } from "@/lib/auth/session";
import { backTo, facebookAuthUrl, newState, setStateCookie } from "@/lib/auth/oauth";
import { appReturn, clearAppCookie, setAppCookie } from "@/lib/auth/appTicket";
import { logError } from "@/lib/log";

export async function GET(request: NextRequest) {
    const next = request.nextUrl.searchParams.get("next") ?? "/";
    const app = request.nextUrl.searchParams.get("app") === "1";
    if (!(AUTH_CONFIG.facebookAppId && AUTH_CONFIG.facebookAppSecret)) {
        logError("Facebook sign-in is not set up in lib/auth/config.ts");
        return NextResponse.redirect(app ? appReturn({ error: "facebook_failed" }) : backTo(request, next, "facebook_failed"));
    }

    const link = !app && request.nextUrl.searchParams.get("link") === "1";
    if (link && !(await getCurrentUser())) return NextResponse.redirect(backTo(request, next, "link_signin"));

    const state = newState(next, link ? "link" : "signin");
    const response = NextResponse.redirect(facebookAuthUrl(request, state));
    setStateCookie(response, "facebook", state);
    if (app) setAppCookie(response, "facebook");
    else clearAppCookie(response, "facebook"); // a website sign-in after an unfinished app one
    return response;
}