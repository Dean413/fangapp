"use client";

import { Check } from "lucide-react";
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
                                        <span className="font-bold text-yellow-950 text-xs md:text-xl">{t("bestValue")}</span>
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

                    </div>
                </div>
            )}

            {/* Cards */}
            <div className="grid grid-cols-1 gap-6 max-w-3xl mx-auto w-full">

                {/* Weekly VIP */}
                <div className="flex flex-col gap-5 rounded-2xl p-6 text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                    style={{ background: "#1a1a1a" }}>
                    <div className="flex flex-1 items-center gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <Image src="/fang_pictures/weekly-vip-crown.png" alt="" aria-hidden="true" width={20} height={20} className="h-5 w-5 object-contain" />
                                <p className="text-lg font-bold">{t("weekly")}</p>
                            </div>
                            <p className="mt-2">
                                <span className="text-3xl font-extrabold">{formatUsd(VIP_PLAN_INFO.weekly.priceCents)}</span>
                                <span className="text-sm text-white/50"> {t("perWeek")}</span>
                            </p>

                            <ul className="mt-5 flex flex-col gap-3">
                                {weeklyFeatures.map((f) => (
                                    <li key={f} className="flex items-center gap-2 text-xs text-white/80">
                                        <Check className="shrink-0 text-white/70" size={12} />
                                        {t(f)}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <Image src="/fang_pictures/weekly-vip-crown.png" alt="" aria-hidden="true" width={200} height={200}
                            className="w-28 shrink-0 object-contain sm:w-36" />
                    </div>

                    <button onClick={() => subscribe("weekly")} disabled={hasVip}
                        className="w-full rounded-lg py-3 text-sm font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
                        style={{ background: "#c0392b" }}>
                        {t("subscribeWeekly")}
                    </button>
                </div>

                {/* Monthly VIP */}
                <div className="relative flex flex-col gap-5 rounded-2xl p-6 text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                    style={{ background: "linear-gradient(135deg, #8b0f0a 0%, #c0392b 100%)" }}>
                    {/* Best value badge */}
                    <div className="absolute right-6 top-0 -translate-y-1/2 rounded px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: "#f0a500", color: "#1a1000" }}>
                        {t("bestValue")}
                    </div>

                    <div className="flex flex-1 items-center gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <Image src="/fang_pictures/monthly-vip-crown.png" alt="" aria-hidden="true" width={20} height={20} className="h-5 w-5 object-contain" />
                                <p className="text-lg font-bold">{t("monthly")}</p>
                            </div>
                            <p className="mt-2">
                                <span className="text-3xl font-extrabold">{formatUsd(VIP_PLAN_INFO.monthly.priceCents)}</span>
                                <span className="text-sm text-white/60"> {t("perMonth")}</span>
                            </p>

                            <ul className="mt-5 flex flex-col gap-3">
                                {monthlyFeatures.map((f) => (
                                    <li key={f} className="flex items-center gap-2 text-xs text-white/90">
                                        <Check className="shrink-0 text-white/80" size={12} />
                                        {t(f)}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <Image src="/fang_pictures/monthly-vip-crown.png" alt="" aria-hidden="true" width={200} height={200}
                            className="w-28 shrink-0 object-contain sm:w-36" />
                    </div>

                    <button onClick={() => subscribe("monthly")} disabled={hasVip}
                        className="w-full rounded-lg py-3 text-sm font-bold transition-all duration-200 hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
                        style={{ background: "#f0a500", color: "#1a1000" }}>
                        {t("subscribeMonthly")}
                    </button>
                </div>

                {/* Savings banner */}
                <div className="flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 w-full">
                    <span className="text-xl">🪙</span>
                    <p className="text-amber-800 dark:text-amber-300 text-sm font-medium">
                        {t("save", { percent: monthlySavingPercent() })}
                    </p>
                </div>

            </div>

            <TopUpModal plan={checkoutPlan} onClose={() => setCheckoutPlan(null)} />

        </div>
    );
}