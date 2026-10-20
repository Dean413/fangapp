"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { toast } from "react-toastify";

const BEAT_EVERY = 30 * 1000;      // a "still reading" signal every 30 seconds
const IDLE_AFTER = 2 * 60 * 1000;  // no scroll / touch / key for 2 minutes: not reading

// Sends "still reading" signals while the chapter is open, the tab is visible and the reader is active.
// It never sends a time: the server counts the real time between signals (see lib/readingRewards.ts).
export function useRewardTimers(isActive?: boolean) {
    const lastInput = useRef(Date.now());
    const signedIn = useAuthStore((s) => Boolean(s.user));

    // Any scroll, touch, click or key counts as reading activity
    useEffect(() => {
        const mark = () => { lastInput.current = Date.now(); };
        const events = ["scroll", "wheel", "touchstart", "pointerdown", "keydown"] as const;
        events.forEach((e) => window.addEventListener(e, mark, { passive: true }));
        return () => events.forEach((e) => window.removeEventListener(e, mark));
    }, []);

    useEffect(() => {
        if (!isActive || !signedIn) return;

        const beat = () => {
            if (document.visibilityState !== "visible") return;
            if (Date.now() - lastInput.current > IDLE_AFTER) return;
            fetch("/api/rewards/reading/heartbeat", { method: "POST", credentials: "include", keepalive: true })
                .then((res) => (res.ok ? res.json() : null))
                .then((body) => {
                    // 30 minutes reached: the gem was added; show it in the wallet straight away
                    if (!body?.gem || !body.wallet) return;
                    const user = useAuthStore.getState().user;
                    if (user) useAuthStore.getState().setUser({ ...user, wallet: body.wallet });
                    toast.success(`+${body.gem} gem for 30 minutes of reading`);
                })
                .catch(() => { });
        };

        // Coming back to the tab starts a new reading stretch
        const onVisible = () => {
            if (document.visibilityState === "visible") {
                lastInput.current = Date.now();
                beat();
            }
        };

        lastInput.current = Date.now();
        beat();
        const interval = setInterval(beat, BEAT_EVERY);
        document.addEventListener("visibilitychange", onVisible);

        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [isActive, signedIn]);
}