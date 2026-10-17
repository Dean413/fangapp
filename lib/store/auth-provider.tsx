"use client";

import { useEffect } from "react";
import { toast } from "react-toastify";
import { useAuthStore } from "./authStore";
import { useLibraryStore } from "./library-store";

// Messages for ?auth_error=<code>, added to the address when Google/Facebook sign-in fails
const AUTH_ERRORS: Record<string, string> = {
    cancelled: "Sign-in was cancelled.",
    google_failed: "Couldn't sign in with Google. Please try again.",
    google_unverified: "Your Google email isn't verified. Verify it with Google, or sign up with email.",
    facebook_failed: "Couldn't sign in with Facebook. Please try again.",
    facebook_no_email: "Your Facebook account has no email address. Please sign up with email instead.",
    email_exists: "An account with this email already exists. Sign in with your email and password or Google.",
    link_expired: "Please sign in with your email and password.",
    account_closed: "This account has been closed. If you think this is a mistake, contact support@fangwriters.com.",
    not_allowed: "This account can't be used to sign in here.",
};

export default function AuthProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const fetchUser = useAuthStore((s) => s.fetchUser);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    // The saved books (for "Add to library" buttons everywhere), loaded for the signed-in account
    const userId = useAuthStore((s) => s.user?.id);
    useEffect(() => {
        if (userId) useLibraryStore.getState().fetchLibrary();
        else useLibraryStore.getState().reset();
    }, [userId]);

    // After a Google/Facebook sign-in: show what went wrong (if anything), then tidy the address bar
    useEffect(() => {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("auth_error");
        if (!code) return;
        toast.error(AUTH_ERRORS[code] ?? "Sign-in failed. Please try again.");
        url.searchParams.delete("auth_error");
        window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }, []);

    return <>{children}</>;
}