"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { toast } from "@/lib/store/toastStore";
import { useTranslations } from "next-intl";

// Runs quietly for signed-in readers: saves their timezone and picks up today's VIP bonus coins.
// Checked when the app opens and when the tab comes back (so a new day is noticed), at most every 10 minutes.
export default function VipSync() {
    const signedIn = useAuthStore((s) => Boolean(s.user));
    const t = useTranslations("Wallet");
    const lastRun = useRef(0);

    useEffect(() => {
        if (!signedIn) return;

        const run = () => {
            if (Date.now() - lastRun.current < 10 * 60 * 1000) return;
            lastRun.current = Date.now();

            let timezone = "UTC";
            try {
                timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
            } catch {
                // keep UTC
            }

            fetch("/api/vip/daily", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ timezone }),
            })
                .then((res) => (res.ok ? res.json() : null))
                .then((body) => {
                    if (!body) return;
                    const user = useAuthStore.getState().user;
                    if (body.wallet && user) useAuthStore.getState().setUser({ ...user, wallet: body.wallet });
                    if (body.credited > 0) toast.success(t("vipSyncBonus", { coins: body.credited }));
                })
                .catch(() => { });
        };

        run();
        const onVisible = () => document.visibilityState === "visible" && run();
        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
    }, [signedIn]);

    return null;
}