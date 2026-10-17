"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SectionTitle } from "./earn-card";
import Image from "next/image";
import { ClipboardCheck } from "lucide-react";
import { toast } from "react-toastify";
import { useAuthStore } from "@/lib/store/authStore";

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

export default function DailyCheckIn() {
    const [status, setStatus] = useState<CheckinStatus | null>(null);
    const [remainingTime, setRemainingTime] = useState(0);
    const [claiming, setClaiming] = useState(false);
    // Blocks a second click before the page has re-drawn
    const busy = useRef(false);
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
        try {
            const res = await fetch("/api/rewards/daily-checkin", { credentials: "include", cache: "no-store" });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.status) applyStatus(data.status);
        } catch {
            // keep what's shown; the button stays off until the status loads
        }
    }, [applyStatus]);

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
            const res = await fetch("/api/rewards/daily-checkin", {
                method: "POST",
                credentials: "include",
            });
            const data = await res.json().catch(() => ({}));

            if (data.status) applyStatus(data.status);

            if (!res.ok) {
                toast.error(data.message || "Couldn't claim your reward");
                return;
            }

            // Show the new balance straight away
            const user = useAuthStore.getState().user;
            if (user && data.wallet) useAuthStore.getState().setUser({ ...user, wallet: data.wallet });
            toast.success(data.message || "Reward claimed");
        } catch {
            toast.error("Unable to reach the server. Please try again.");
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

    return (
        <div className="w-full">
            <SectionTitle title={
                <div className="flex gap-2">
                    <ClipboardCheck className="text-red-500" />
                    <p>Daily Check-in (7 day loop)</p>
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
                            <p className="text-xs text-gray-400 dark:text-neutral-500">DAY</p>
                            <p className="text-lg font-bold">{item.day}</p>

                            <div className="flex justify-center">
                                {isCompleted ? (
                                    <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-xs">✓</div>
                                ) : (
                                    <Image
                                        src="/fang_pictures/balance.png"
                                        alt="reward"
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

            <button type="button" onClick={handleClaim} disabled={!canClaim}
                className={`w-full py-3 rounded-xl text-white ${canClaim ? "bg-red-500" : "bg-gray-400 dark:bg-neutral-700 cursor-not-allowed"}`}>
                {!status ? (
                    <span>Loading...</span>
                ) : claiming ? (
                    <span>Claiming...</span>
                ) : status.canClaim ? (
                    <div className="flex items-center justify-center gap-2">
                        <span>Claim Reward today + {status.nextCoins}</span>
                        <Image
                            src="/fang_pictures/balance.png"
                            alt="coin"
                            width={16}
                            height={16}
                        />
                    </div>
                ) : (
                    <span>Next Claim in {formatTime(remainingTime)}</span>
                )}
            </button>
        </div>
    );
}