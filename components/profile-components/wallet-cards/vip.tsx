"use client";

import { CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import SelectionCard from "./vip-selection";
import { useLocale, useTranslations } from "next-intl";

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
    const [selectedPlan, setSelectedPlan] = useState<"weekly" | "monthly" | null>(null);
    const [vip, setVip] = useState<VipState | null>(null);
    const t = useTranslations("Vip");
    const locale = useLocale();

    // The reader's real VIP plan, if they have one
    useEffect(() => {
        fetch("/api/vip/status", { credentials: "include", cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((body) => setVip(body))
            .catch(() => { });
    }, []);

    return (
        <div className="flex flex-col gap-6">
            {/* Active VIP: plan, end date and today's free unlocks */}
            {vip?.active && vip.endsAt && (
                <div className="max-w-5xl mx-auto w-full rounded-2xl p-5 text-white bg-linear-to-r from-black to-gray-900 dark:bg-none dark:bg-dark-card dark:border dark:border-dark-border md:flex items-center justify-between gap-4">
                    <div>
                        <p className="text-xl font-bold text-yellow-400">
                            {vip.plan === "weekly" ? t("youAreWeekly") : t("youAreMonthly")}
                        </p>
                        <p className="text-sm text-white/70">
                            {t("activeUntil", { date: new Date(vip.endsAt).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }) })}
                        </p>
                    </div>
                    <p className="mt-3 md:mt-0 text-sm text-white/80">
                        {t.rich("freeUnlocks", { left: vip.freeUnlocksLeft, total: vip.freeUnlocksPerDay, b: (chunks) => <span className="font-bold text-white">{chunks}</span> })}
                    </p>
                </div>
            )}

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl mx-auto w-full">

                {/* Weekly VIP */}
                {!selectedPlan && (
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
                                    <span className="text-3xl font-extrabold">$9.99</span>
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

                            <button onClick={() => setSelectedPlan("weekly")} className="w-full py-3 rounded-xl bg-red-600 font-bold text-sm
                        transition-all duration-200 hover:bg-red-500 active:scale-95">
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
                                    <span className="text-3xl font-extrabold">$29.99</span>
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

                            <button onClick={() => setSelectedPlan("monthly")} className="w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 hover:opacity-90 active:scale-95"
                                style={{ background: "linear-gradient(90deg, #c9a227, #f0d060)", color: "#2a1a00", }}>
                                {t("subscribeMonthly")}
                            </button>
                        </div>
                        {/* Savings banner */}
                        <div className="flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 max-w-5xl mx-auto w-full">
                            <span className="text-xl">🪙</span>
                            <p className="text-amber-800 dark:text-amber-300 text-sm font-medium">
                                {t("save", { percent: 25 })}
                            </p>
                        </div>
                    </>

                )}

            </div>


            {selectedPlan && (
                <SelectionCard plan={selectedPlan} isVip />
            )}

        </div>
    );
}