// app/api/auth/google/callback/route.ts
// Google sends the browser back here. Checks the state, gets the verified Google profile,
// signs in (or creates the account), gives the sign-up bonus once, and goes back to the page the reader was on.
// From Settings (link mode): connects the account to the signed-in reader instead.
import { NextRequest, NextResponse } from "next/server";
import { backTo, clearStateCookie, googleProfile, readState } from "@/lib/auth/oauth";
import { prepareReader, signInWithProvider } from "@/lib/auth/account";
import { getCurrentUser, startSession } from "@/lib/auth/session";
import { linkProvider } from "@/lib/settings";
import { logError } from "@/lib/log";

export async function GET(request: NextRequest) {
    const saved = readState(request, "google");
    const next = saved?.next ?? "/";

    const finish = (error?: string) => {
        const response = NextResponse.redirect(backTo(request, next, error));
        clearStateCookie(response, "google");
        return response;
    };

    if (!saved) return finish("google_failed");
    if (request.nextUrl.searchParams.get("error")) return finish("cancelled"); // the reader closed or refused
    const code = request.nextUrl.searchParams.get("code");
    if (!code) return finish("google_failed");

    try {
        const profile = await googleProfile(request, code, saved.verifier);

        // From Settings: connect it to the signed-in account
        if (saved.mode === "link") {
            const current = await getCurrentUser();
            if (!current) return finish("link_signin");
            const linked = await linkProvider(current.id, "google", profile.providerUserId, profile.email);
            return finish(linked === "ok" ? undefined : "linked_elsewhere");
        }

        const result = await signInWithProvider(profile);
        if (!result.ok) return finish(result.code.toLowerCase());

        await startSession(result.user);
        await prepareReader(result.user.id);
        return finish();
    } catch (error) {
        logError("Google sign-in error:", error);
        const unverified = error instanceof Error && error.message === "GOOGLE_EMAIL_NOT_VERIFIED";
        return finish(unverified ? "google_unverified" : "google_failed");
    }
}