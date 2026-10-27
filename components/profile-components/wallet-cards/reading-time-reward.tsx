"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/lib/store/toastStore";
import { useAuthStore } from "@/lib/store/authStore";
import { useTranslations } from "next-intl";

type T = (key: string, values?: Record<string, string | number>) => string;

// What the server says (reading time is counted by the server, never by this browser)
type Milestone = { minutes: number; coins: number; reached: boolean; claimed: boolean };
type ReadingStatus = {
    seconds: number;
    periodEndsAt: string | null;
    serverNow: string;
    milestones: Milestone[];
};

const DEFAULT_MILESTONES: Milestone[] = [
    { minutes: 15, coins: 5, reached: false, claimed: false },
    { minutes: 30, coins: 8, reached: false, claimed: false },
    { minutes: 60, coins: 15, reached: false, claimed: false },
    { minutes: 90, coins: 22, reached: false, claimed: false },
];

const label = (minutes: number, t: T) =>
    minutes < 60 ? t("minutes", { count: minutes }) : minutes % 60 === 0 ? t("hours", { count: minutes / 60 }) : t("hoursMinutes", { h: Math.floor(minutes / 60), m: minutes % 60 });

const formatTime = (ms: number) => {
    const totalSec = Math.ceil(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
};

type RewardCardProps = {
    milestone: Milestone;
    seconds: number;
    resetIn: number;            // ms until the 24-hour period resets
    claiming: boolean;
    onClaim: (minutes: number) => void;
};

export function RewardCard({ milestone, seconds, resetIn, claiming, onClaim }: RewardCardProps) {
    const limit = milestone.minutes * 60;
    const percent = limit > 0 ? Math.min((seconds / limit) * 100, 100) : 0;
    const canClaim = milestone.reached && !milestone.claimed && !claiming;
    const t = useTranslations("Wallet");

    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-dark-card dark:shadow-none">
            <p className="text-lg font-semibold">{label(milestone.minutes, t)}</p>

            <div className="mt-3 flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/fang_pictures/coin-topup.png" alt="coin" width={24} height={24} className="shrink-0" />
                <p className="text-base font-medium text-[#B7791F] dark:text-amber-400">
                    +{milestone.coins} {t("coinsUnit")}
                </p>
            </div>

            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-neutral-700">
                <div
                    className={`h-full rounded-full transition-all duration-300 ${milestone.reached || milestone.claimed ? "bg-red-600" : "bg-amber-400"}`}
                    style={{ width: `${milestone.claimed ? 100 : percent}%` }}
                />
            </div>

            <button
                type="button"
                onClick={() => onClaim(milestone.minutes)}
                disabled={!canClaim}
                className={`mt-4 w-full rounded-xl py-3 text-base font-semibold ${canClaim
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "cursor-not-allowed bg-gray-100 text-gray-500 dark:bg-neutral-700 dark:text-neutral-300"
                    }`}
            >
                {milestone.claimed
                    ? formatTime(resetIn)
                    : claiming
                        ? t("claiming")
                        : milestone.reached
                            ? t("claim")
                            : t("inProgress")}
            </button>
        </div>
    );
}

// The four reading-time cards on the wallet's Earn tab
export default function ReadingRewards() {
    const [status, setStatus] = useState<ReadingStatus | null>(null);
    const t = useTranslations("Wallet");
    const c = useTranslations("Common");
    const [claimingMinutes, setClaimingMinutes] = useState<number | null>(null);
    const [resetIn, setResetIn] = useState(0);
    const busy = useRef(false);
    const resetsAt = useRef<number | null>(null);

    const applyStatus = useCallback((s: ReadingStatus) => {
        setStatus(s);
        if (s.periodEndsAt) {
            const wait = new Date(s.periodEndsAt).getTime() - new Date(s.serverNow).getTime();
            resetsAt.current = Date.now() + Math.max(wait, 0);
            setResetIn(Math.max(wait, 0));
        } else {
            resetsAt.current = null;
            setResetIn(0);
        }
    }, []);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/rewards/reading", { credentials: "include", cache: "no-store" });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.status) applyStatus(data.status);
        } catch {
            // keep what's shown
        }
    }, [applyStatus]);

    useEffect(() => {
        load();
    }, [load]);

    // Reset countdown; when the period ends, ask the server again
    useEffect(() => {
        const interval = setInterval(() => {
            if (resetsAt.current === null) return;
            const left = Math.max(resetsAt.current - Date.now(), 0);
            setResetIn(left);
            if (left <= 0) {
                resetsAt.current = null;
                load();
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [load]);

    const claim = async (minutes: number) => {
        if (busy.current) return;
        busy.current = true;
        setClaimingMinutes(minutes);
        try {
            const res = await fetch("/api/rewards/reading/claim", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ minutes }),
            });
            const data = await res.json().catch(() => ({}));
            if (data.status) applyStatus(data.status);
            if (!res.ok) {
                toast.error(data.message || t("claimFailed"));
                return;
            }
            const user = useAuthStore.getState().user;
            if (user && data.wallet) useAuthStore.getState().setUser({ ...user, wallet: data.wallet });
            toast.success(data.message || t("claimed"));
        } catch {
            toast.error(c("networkError"));
        } finally {
            busy.current = false;
            setClaimingMinutes(null);
        }
    };

    const milestones = status?.milestones ?? DEFAULT_MILESTONES;

    return (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 my-4">
            {milestones.map((m) => (
                <RewardCard
                    key={m.minutes}
                    milestone={m}
                    seconds={status?.seconds ?? 0}
                    resetIn={resetIn}
                    claiming={claimingMinutes === m.minutes}
                    onClaim={claim}
                />
            ))}
        </div>
    );
}