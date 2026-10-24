"use client";

import { CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuthStore } from "@/lib/store/authStore";
import { toast } from "@/lib/store/toastStore";
import { VIP_PLAN_INFO, formatUsd, monthlySavingPercent, type VipPlanId } from "@/lib/vipRates";
import TopUpModal from "./topUp";
import Image from "next/image";

// Messages under Vip
const weeklyFeatures = ["weekly1", "weekly2", "weekly3", "weekly4", "weekly5"];
const monthlyFeatures = ["monthly1", "monthly2", "monthly3", "monthly4", "monthly5", "monthly6"];

type VipState = {
    active: boolean;
    plan: "weekly" | "monthly" | null;
    endsAt: string | null;
    freeUnlocksPerDay: number;
    freeUnlocksLeft: number;
};

export default function VipPlans() {
    const [checkoutPlan, setCheckoutPlan] = useState<VipPlanId | null>(null);
    const user = useAuthStore((s) => s.user);
    const [vip, setVip] = useState<VipState | null>(null);
    const [recurring, setRecurring] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const t = useTranslations("Vip");
    const w = useTranslations("Wallet");
    const locale = useLocale();

    // The reader's real VIP plan, if they have one
    useEffect(() => {
        fetch("/api/vip/status", { credentials: "include", cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((body) => setVip(body?.vip ?? body))
            .catch(() => { });

        // Will it renew by itself?
        fetch("/api/vip/subscription", { credentials: "include", cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((body) => setRecurring(!!body?.recurring))
            .catch(() => { });
    }, []);

    const hasVip = !!vip?.active;
    const endsOn = vip?.endsAt
        ? new Date(vip.endsAt).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
        : "";

    function subscribe(plan: VipPlanId) {
        if (hasVip) return;
        if (!user) {
            toast.error(w("signInToClaim"));
            return;
        }
        setCheckoutPlan(plan);
    }

    // Stops the renewal. VIP stays until the end of the period they already paid for.
    async function cancelRenewal() {
        if (cancelling) return;
        setCancelling(true);
        try {
            const res = await fetch("/api/vip/subscription", { method: "POST", credentials: "include" });
            if (!res.ok) throw new Error("cancel failed");
            setRecurring(false);
            setConfirming(false);
            toast.success(t("renewalCancelled"));
        } catch {
            toast.error(t("cancelFailed"));
        }
        setCancelling(false);
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Active VIP: plan, end date and today's free unlocks */}
            {vip?.active && vip.endsAt && (
                <div className="max-w-5xl mx-auto w-full bg-linear-to-r from-black to-gray-900 dark:bg-none dark:bg-dark-card text-white rounded-2xl px-6 py-1 md:flex items-center justify-between">
                    <div className="flex items-center gap-2 md:gap-8">
                        <h2 className="text-4xl font-bold flex items-center gap-2">
                            <Image
                                src="/fang_pictures/vip.png"
                                width={120}
                                height={120}
                                alt={w("coinBalance")}
                            />
                        </h2>

                        <div>
                            <p className="text-xl">{t("currentPlan")}</p>
                            <div className="md:flex items-center gap-8">
                                <p className="text-xl md:text-3xl font-bold text-yellow-400">
                                    {vip.plan === "weekly" ? t("weekly") : t("monthly")}
                                </p>
                                {vip.plan === "monthly" && (
                                    <div className="inline-flex items-center justify-center rounded-full px-4 py-1
                                        bg-linear-to-b from-yellow-200 via-yellow-300 to-yellow-400
                                        border border-yellow-500
                                        shadow-[0_6px_16px_rgba(0,0,0,0.15)]
                                        ring-2 ring-yellow-200/50">
                                        <span className="font-bold text-yellow-950 dark:text-yellow-300 text-xs md:text-xl">{t("bestValue")}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="py-3 md:py-0 md:text-right">
                        <p className="text-sm text-white/80">
                            {recurring ? t("renewsOn", { date: endsOn }) : t("activeUntil", { date: endsOn })}
                        </p>
                        <p className="mt-1 text-sm text-white/80">
                            {t.rich("freeUnlocks", { left: vip.freeUnlocksLeft, total: vip.freeUnlocksPerDay, b: (chunks) => <span className="font-bold text-white">{chunks}</span> })}
                        </p>
                        {recurring && (
                            confirming ? (
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm md:justify-end">
                                    <span className="text-white/80">{t("cancelSure", { date: endsOn })}</span>
                                    <button type="button" onClick={cancelRenewal} disabled={cancelling} className="rounded-lg bg-red-600 px-3 py-1 font-semibold disabled:opacity-50">{t("cancelYes")}</button>
                                    <button type="button" onClick={() => setConfirming(false)} disabled={cancelling} className="rounded-lg border border-white/30 px-3 py-1 disabled:opacity-50">{t("cancelNo")}</button>
                                </div>
                            ) : (
                                <button type="button" onClick={() => setConfirming(true)} className="mt-2 text-sm text-white/60 underline hover:text-white">{t("cancelRenewal")}</button>
                            )
                        )}
                    </div>
                </div>
            )}

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl mx-auto w-full">

                {/* Weekly VIP */}
                {(
                    <>
                        <div className="w-full md:w-[80%] space-y-6 rounded-2xl p-6 flex flex-col gap-5 text-white shadow-lg transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 hover:shadow-2xl"
                            style={{ background: "linear-gradient(160deg, #2d1212 0%, #1a0808 100%)", }}>
                            {/* Crown */}
                            <div className="w-11 h-11 rounded-xl bg-red-600 flex items-center justify-center text-xl">
                                👑
                            </div>

                            <div>
                                <p className="text-xl font-bold">{t("weekly")}</p>
                                <p className="mt-1">
                                    <span className="text-3xl font-extrabold">{formatUsd(VIP_PLAN_INFO.weekly.priceCents)}</span>
                                    <span className="text-white/50 text-sm"> {t("perWeek")}</span>
                                </p>
                            </div>

                            <ul className="flex flex-col gap-2 flex-1">
                                {weeklyFeatures.map((f) => (
                                    <li key={f} className="flex my-2 items-center gap-2 text-white/80 text-sm">
                                        <CheckCircle className="text-red-500 shrink-0" size={16} />
                                        {t(f)}
                                    </li>
                                ))}
                            </ul>

                            <button onClick={() => subscribe("weekly")} disabled={hasVip} className="w-full py-3 rounded-xl bg-red-600 font-bold text-sm
                        transition-all duration-200 hover:bg-red-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-red-600 disabled:active:scale-100">
                                {t("subscribeWeekly")}
                            </button>
                        </div>

                        {/* Monthly VIP */}
                        <div className="relative w-full md:w-[80%] space-y-6 rounded-2xl p-6 flex flex-col gap-5 shadow-lg transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 hover:shadow-2xl"
                            style={{ background: "linear-gradient(160deg, #1e1604 0%, #0e0b04 100%)", border: "1.5px solid #c9a227", }}>
                            {/* Best value badge */}
                            <div
                                className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest"
                                style={{
                                    background: "linear-gradient(90deg, #c9a227, #f0d060)",
                                    color: "#2a1a00",
                                }}
                            >
                                {t("bestValue")}
                            </div>

                            {/* Crown */}
                            <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                                style={{
                                    background: "linear-gradient(135deg, #c9a227, #f0d060)",
                                }}
                            >
                                👑
                            </div>

                            <div>
                                <p className="text-xl font-bold text-white">{t("monthly")}</p>
                                <p className="mt-1 text-white">
                                    <span className="text-3xl font-extrabold">{formatUsd(VIP_PLAN_INFO.monthly.priceCents)}</span>
                                    <span className="text-white/50 text-sm"> {t("perMonth")}</span>
                                </p>
                            </div>

                            <ul className="flex flex-col gap-2 flex-1">
                                {monthlyFeatures.map((f) => (
                                    <li key={f} className="flex items-center my-2 gap-2 text-white/80 text-sm">
                                        <CheckCircle className="shrink-0" size={16} style={{ color: "#c9a227" }} />
                                        {t(f)}
                                    </li>
                                ))}
                            </ul>

                            <button onClick={() => subscribe("monthly")} disabled={hasVip} className="w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
                                style={{ background: "linear-gradient(90deg, #c9a227, #f0d060)", color: "#2a1a00", }}>
                                {t("subscribeMonthly")}
                            </button>
                        </div>
                        {/* Savings banner */}
                        <div className="flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 max-w-5xl mx-auto w-full">
                            <span className="text-xl">🪙</span>
                            <p className="text-amber-800 dark:text-amber-300 text-sm font-medium">
                                {t("save", { percent: monthlySavingPercent() })}
                            </p>
                        </div>
                    </>

                )}

            </div>


            <TopUpModal plan={checkoutPlan} onClose={() => setCheckoutPlan(null)} />

        </div>
    );
}