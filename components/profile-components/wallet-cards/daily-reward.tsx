"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SectionTitle } from "./earn-card";
import Image from "next/image";
import { ClipboardCheck } from "lucide-react";
import { toast } from "@/lib/store/toastStore";
import { useAuthStore } from "@/lib/store/authStore";
import { useTranslations } from "next-intl";

// What the server says (the amounts and the timer come from the server, never from this browser)
type CheckinStatus = {
    claimedDays: number;
    nextDay: number;
    nextCoins: number;
    canClaim: boolean;
    nextClaimAt: string | null;
    serverNow: string;
    rewards: number[];
};

const DEFAULT_REWARDS = [5, 10, 15, 20, 25, 30, 35];
// Give up on a request the server hasn't answered after this long
const TIMEOUT_MS = 15000;

async function fetchWithTimeout(url: string, init: RequestInit = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

export default function DailyCheckIn() {
    const [status, setStatus] = useState<CheckinStatus | null>(null);
    const t = useTranslations("Wallet");
    const c = useTranslations("Common");
    const [loadError, setLoadError] = useState<string | null>(null);
    const [signedOut, setSignedOut] = useState(false);
    const [loading, setLoading] = useState(true);
    const [remainingTime, setRemainingTime] = useState(0);
    const [claiming, setClaiming] = useState(false);
    // Blocks a second click before the page has re-drawn
    const busy = useRef(false);
    const loadBusy = useRef(false);
    // When the next claim opens, on this browser's clock (worked out from the server's time)
    const opensAt = useRef<number | null>(null);

    const applyStatus = useCallback((s: CheckinStatus) => {
        setStatus(s);
        if (s.nextClaimAt) {
            const wait = new Date(s.nextClaimAt).getTime() - new Date(s.serverNow).getTime();
            opensAt.current = Date.now() + Math.max(wait, 0);
            setRemainingTime(Math.max(wait, 0));
        } else {
            opensAt.current = null;
            setRemainingTime(0);
        }
    }, []);

    const loadStatus = useCallback(async () => {
        if (loadBusy.current) return;
        loadBusy.current = true;
        setLoading(true);
        setLoadError(null);
        try {
            const res = await fetchWithTimeout("/api/rewards/daily-checkin", { credentials: "include", cache: "no-store" });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.status) {
                setSignedOut(false);
                applyStatus(data.status);
                return;
            }
            if (res.status === 401) {
                setSignedOut(true);
                return;
            }
            setLoadError(data.message || t("checkinLoadFailed"));
        } catch (error) {
            setLoadError(
                error instanceof DOMException && error.name === "AbortError"
                    ? t("tooSlow")
                    : t("unreachable")
            );
        } finally {
            loadBusy.current = false;
            setLoading(false);
        }
    }, [applyStatus, t]);

    useEffect(() => {
        loadStatus();
    }, [loadStatus]);

    // Countdown; when it reaches zero, ask the server again
    useEffect(() => {
        if (!status || status.canClaim) return;
        const interval = setInterval(() => {
            if (opensAt.current === null) return;
            const remaining = Math.max(opensAt.current - Date.now(), 0);
            setRemainingTime(remaining);
            if (remaining <= 0) {
                clearInterval(interval);
                loadStatus();
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [status, loadStatus]);

    const handleClaim = async () => {
        if (busy.current || !status?.canClaim) return;
        busy.current = true;
        setClaiming(true);
        try {
            const res = await fetchWithTimeout("/api/rewards/daily-checkin", {
                method: "POST",
                credentials: "include",
            });
            const data = await res.json().catch(() => ({}));

            if (data.status) applyStatus(data.status);

            if (!res.ok) {
                toast.error(data.message || t("claimFailed"));
                return;
            }

            // Show the new balance straight away
            const user = useAuthStore.getState().user;
            if (user && data.wallet) useAuthStore.getState().setUser({ ...user, wallet: data.wallet });
            toast.success(data.message || t("claimed"));
        } catch (error) {
            toast.error(
                error instanceof DOMException && error.name === "AbortError"
                    ? t("tooSlowCheckWallet")
                    : c("networkError")
            );
        } finally {
            busy.current = false;
            setClaiming(false);
        }
    };

    const formatTime = (ms: number) => {
        const sec = Math.floor(ms / 1000);
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;

        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };

    const rewards = (status?.rewards ?? DEFAULT_REWARDS).map((coins, i) => ({ day: i + 1, coins }));
    const claimedDays = status?.claimedDays ?? 0;
    const canClaim = Boolean(status?.canClaim) && !claiming;
    // Load failed: the button becomes "Try again"
    const canRetry = !status && !loading && Boolean(loadError);

    return (
        <div className="w-full">
            <SectionTitle title={
                <div className="flex gap-2">
                    <ClipboardCheck className="text-red-500" />
                    <p>{t("dailyCheckin")}</p>
                </div>
            } />
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3 my-4">
                {rewards.map((item) => {
                    const isCompleted = item.day <= claimedDays;
                    const isCurrent = item.day === claimedDays + 1;
                    const isLocked = item.day > claimedDays + 1;
                    return (
                        <div key={item.day} className={`p-3 rounded-xl border text-center space-y-2
                            ${isCompleted ? "bg-white dark:bg-dark-card border-gray-300 dark:border-neutral-700" : ""}
                            ${isCurrent ? "bg-red-100 dark:bg-red-500/15 border-red-400" : ""}
                            ${isLocked ? "bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border opacity-70" : ""}`}>
                            <p className="text-xs text-gray-400 dark:text-neutral-500 uppercase">{t("day")}</p>
                            <p className="text-lg font-bold">{item.day}</p>

                            <div className="flex justify-center">
                                {isCompleted ? (
                                    <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-xs">✓</div>
                                ) : (
                                    <Image
                                        src="/fang_pictures/balance.png"
                                        alt={t("reward")}
                                        width={14}
                                        height={14}
                                    />
                                )}
                            </div>

                            <p className="text-sm">
                                <span className="text-green-500">+ {item.coins}</span>
                            </p>
                        </div>
                    );
                })}
            </div>

            <button type="button" onClick={canRetry ? loadStatus : handleClaim} disabled={!canClaim && !canRetry}
                className={`w-full py-3 rounded-xl text-white ${canClaim || canRetry ? "bg-red-500" : "bg-gray-400 dark:bg-neutral-700 cursor-not-allowed"}`}>
                {signedOut && !status ? (
                    <span>{t("signInToClaim")}</span>
                ) : !status && loading ? (
                    <span>{c("loading")}</span>
                ) : canRetry ? (
                    <span>{loadError} · {c("retry")}</span>
                ) : !status ? (
                    <span>{c("loading")}</span>
                ) : claiming ? (
                    <span>{t("claiming")}</span>
                ) : status.canClaim ? (
                    <div className="flex items-center justify-center gap-2">
                        <span>{t("claimToday", { coins: status.nextCoins })}</span>
                        <Image
                            src="/fang_pictures/balance.png"
                            alt="coin"
                            width={16}
                            height={16}
                        />
                    </div>
                ) : (
                    <span>{t("nextClaimIn", { time: formatTime(remainingTime) })}</span>
                )}
            </button>
        </div>
    );
}