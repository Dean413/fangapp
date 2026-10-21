"use client";

import { useEffect } from "react";
import { toast } from "@/lib/store/toastStore";
import { useAuthStore } from "./authStore";
import { useLibraryStore } from "./library-store";
import TwoFactorCard from "@/components/authCards/twoFactorCards";
import { useTranslations } from "next-intl";

// ?auth_error=<code> is added to the address when Google/Facebook sign-in fails; its message is AuthErrors.<code>
const AUTH_ERRORS = [
    "cancelled", "google_failed", "google_unverified", "facebook_failed", "facebook_no_email", "email_exists",
    "link_expired", "account_closed", "not_allowed", "link_signin", "linked_elsewhere",
];

export default function AuthProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const fetchUser = useAuthStore((s) => s.fetchUser);
    const t = useTranslations("AuthErrors");

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
        toast.error(t(AUTH_ERRORS.includes(code) ? code : "failed"));
        url.searchParams.delete("auth_error");
        window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            {children}
            {/* Two-factor sign-in code card (opens after the right password when two-factor is on) */}
            <TwoFactorCard />
        </>
    );
}