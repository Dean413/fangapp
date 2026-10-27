// app/api/auth/facebook/callback/route.ts
// Facebook sends the browser back here. Checks the state, gets the Facebook profile,
// signs in (or creates the account), gives the sign-up bonus once, and goes back to the page the reader was on.
// From Settings (link mode): connects the account to the signed-in reader instead.
// An email that already has an account is never taken over through Facebook (see lib/auth/accounts.ts).
import { NextRequest, NextResponse } from "next/server";
import { backTo, clearStateCookie, facebookProfile, readState } from "@/lib/auth/oauth";
import { prepareReader, signInWithProvider } from "@/lib/auth/account";
import { getCurrentUser, startSession } from "@/lib/auth/session";
import { linkProvider } from "@/lib/settings";
import { logError } from "@/lib/log";

export async function GET(request: NextRequest) {
    const saved = readState(request, "facebook");
    const next = saved?.next ?? "/";

    const finish = (error?: string) => {
        const response = NextResponse.redirect(backTo(request, next, error));
        clearStateCookie(response, "facebook");
        return response;
    };

    if (!saved) return finish("facebook_failed");
    if (request.nextUrl.searchParams.get("error")) return finish("cancelled");
    const code = request.nextUrl.searchParams.get("code");
    if (!code) return finish("facebook_failed");

    try {
        const profile = await facebookProfile(request, code);

        // From Settings: connect it to the signed-in account
        if (saved.mode === "link") {
            const current = await getCurrentUser();
            if (!current) return finish("link_signin");
            const linked = await linkProvider(current.id, "facebook", profile.providerUserId, profile.email);
            return finish(linked === "ok" ? undefined : "linked_elsewhere");
        }

        const result = await signInWithProvider(profile);
        if (!result.ok) return finish(result.code.toLowerCase());

        await startSession(result.user);
        await prepareReader(result.user.id);
        return finish();
    } catch (error) {
        logError("Facebook sign-in error:", error);
        const noEmail = error instanceof Error && error.message === "FACEBOOK_NO_EMAIL";
        return finish(noEmail ? "facebook_no_email" : "facebook_failed");
    }
}