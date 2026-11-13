// app/api/auth/facebook/callback/route.ts
// Facebook sends the browser back here. Checks the state, gets the Facebook profile,
// signs in (or creates the account), gives the sign-up bonus once, and goes back to the page the reader was on.
// From Settings (link mode): connects the account to the signed-in reader instead.
// From the mobile app (app cookie): the browser goes back into the app with a one-time ticket instead.
// An email that already has an account is never taken over through Facebook (see lib/auth/accounts.ts).
import { NextRequest, NextResponse } from "next/server";
import { backTo, clearStateCookie, facebookProfile, readState } from "@/lib/auth/oauth";
import { appReturn, clearAppCookie, createAppTicket, isAppSignIn } from "@/lib/auth/appTicket";
import { prepareReader, signInWithProvider } from "@/lib/auth/account";
import { getCurrentUser, startSession } from "@/lib/auth/session";
import { linkProvider } from "@/lib/settings";
import { logError } from "@/lib/log";

export async function GET(request: NextRequest) {
    const saved = readState(request, "facebook");
    const next = saved?.next ?? "/";
    const app = isAppSignIn(request, "facebook");

    const finish = (error?: string, ticket?: string) => {
        const target = app ? appReturn(ticket ? { ticket } : { error: error ?? "facebook_failed" }) : backTo(request, next, error);
        const response = NextResponse.redirect(target);
        clearStateCookie(response, "facebook");
        clearAppCookie(response, "facebook");
        return response;
    };

    if (!saved) return finish("facebook_failed");
    if (request.nextUrl.searchParams.get("error")) return finish("cancelled");
    const code = request.nextUrl.searchParams.get("code");
    if (!code) return finish("facebook_failed");

    try {
        const profile = await facebookProfile(request, code);

        // From Settings: connect it to the signed-in account
        if (saved.mode === "link" && !app) {
            const current = await getCurrentUser();
            if (!current) return finish("link_signin");
            const linked = await linkProvider(current.id, "facebook", profile.providerUserId, profile.email);
            return finish(linked === "ok" ? undefined : "linked_elsewhere");
        }

        const result = await signInWithProvider(profile);
        if (!result.ok) return finish(result.code.toLowerCase());

        if (app) {
            // The app signs itself in with the ticket; this browser stays signed out
            await prepareReader(result.user.id);
            return finish(undefined, await createAppTicket(result.user.id, "facebook"));
        }

        await startSession(result.user, "Facebook Login");
        await prepareReader(result.user.id);
        return finish();
    } catch (error) {
        logError("Facebook sign-in error:", error);
        const noEmail = error instanceof Error && error.message === "FACEBOOK_NO_EMAIL";
        return finish(noEmail ? "facebook_no_email" : "facebook_failed");
    }
}