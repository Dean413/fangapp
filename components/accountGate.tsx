"use client";

// Wraps the page content (not the NavBar). A suspended reader can still sign in and see every page, but the
// page is locked and dimmed: only navigation works (the navbar, the footer, the profile menu and breadcrumbs).
// Nothing else can be clicked, typed in or submitted. The notice sits under the navbar, except on the profile
// pages, which show it in their own content column (see app/[locale]/profile/layout.tsx).
// A reader who gets banned (or whose account is deleted) while signed in is signed out within a minute.
// The server also refuses every post, like, vote, unlock and gift from a suspended or banned account.
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/routing";
import { useAuthStore } from "@/lib/store/authStore";
import { useAccountStatus, type AccountState } from "@/lib/store/accountStore";
import { toast } from "@/lib/store/toastStore";
import SuspensionNotice from "@/components/suspensionNotice";

const CHECK_EVERY_MS = 60_000; // re-checked every minute and when the tab comes back, so a change shows without a reload

// Anything inside these still works while suspended: they only take the reader to another page
const NAVIGATION = "footer, nav, [data-nav]";

const block = (e: React.SyntheticEvent) => {
    const target = e.target as Element | null;
    if (target?.closest?.(NAVIGATION)) return;
    e.preventDefault();
    e.stopPropagation();
};

const blockEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") block(e);
};

// Clicks, presses, form submits and typing / pasting are stopped before the page's own code sees them
const lockHandlers = {
    onClickCapture: block,
    onMouseDownCapture: block,
    onSubmitCapture: block,
    onBeforeInputCapture: block,
    onPasteCapture: block,
    onCutCapture: block,
    onDropCapture: block,
    onKeyDownCapture: blockEnter,
};

export default function AccountGate({ children }: { children: React.ReactNode }) {
    const signedIn = useAuthStore((s) => Boolean(s.user));
    const state = useAccountStatus((s) => s.state);
    const setState = useAccountStatus((s) => s.setState);
    const pathname = usePathname();
    const api = useTranslations("Api");
    const apiRef = useRef(api);
    apiRef.current = api;

    useEffect(() => {
        if (!signedIn) return;
        let cancelled = false;

        const check = async () => {
            try {
                const res = await fetch("/api/auth/account-status", { cache: "no-store" });
                if (cancelled) return;

                // The login has ended on the server: make the page show signed out too
                if (res.status === 401) {
                    await useAuthStore.getState().fetchUser();
                    return;
                }
                if (!res.ok) return; // a network hiccup: leave the page as it is

                const data: AccountState = await res.json();
                if (cancelled) return;

                // Banned or deleted while signed in: sign out now, and say why
                if (data.status === "banned" || data.status === "deleted") {
                    setState(null);
                    await useAuthStore.getState().logout();
                    toast.error(apiRef.current("accountClosed"));
                    return;
                }
                setState(data);
            } catch {
                // offline: try again on the next check
            }
        };
        const onVisible = () => {
            if (document.visibilityState === "visible") check();
        };

        check();
        const timer = setInterval(check, CHECK_EVERY_MS);
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            cancelled = true;
            clearInterval(timer);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [signedIn, setState]);

    const locked = signedIn && state?.status === "suspended";
    const profilePage = pathname === "/profile" || pathname.startsWith("/profile/"); // shows its own notice

    return (
        <>
            {!profilePage && <SuspensionNotice />}

            {/* Not suspended: "contents" adds no box, so the page lays out exactly as before.
                Suspended: dimmed and locked, like the writers site. */}
            <div className={locked ? "select-none opacity-60" : "contents"} {...(locked ? lockHandlers : {})}>
                {children}
            </div>
        </>
    );
}