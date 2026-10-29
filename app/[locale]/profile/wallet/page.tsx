"use client";

import CoinCard from "@/components/profile-components/wallet-cards/coin-card";
import EarnSection from "@/components/profile-components/wallet-cards/earn-section";
import VipPlans from "@/components/profile-components/wallet-cards/vip";
import { useWalletStore } from "@/lib/store/wallet-action-store";
import { useAuthStore } from "@/lib/store/authStore";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useEffect, useState } from "react";
import InviteFriends from "@/components/profile-components/wallet-cards/invite-friends";

export default function WalletPage() {
    const router = useRouter()
    const { active, setActive } = useWalletStore()
    const t = useTranslations("Wallet")
    const wallet = useAuthStore((s) => s.user?.wallet)
    const totalBalance = (wallet?.coins ?? 0) + (wallet?.bonusCoins ?? 0) + (wallet?.vipBonusCoins ?? 0)
    const [isVip, setIsVip] = useState(false)
    useEffect(() => {
        let alive = true
        fetch("/api/vip/status", { credentials: "include", cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => { if (alive) setIsVip(Boolean((data?.vip ?? data)?.active)) })
            .catch(() => { })
        return () => { alive = false }
    }, [])
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark p-6">

            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="md:flex items-center justify-between space-y-2 md">
                    <div>
                        <h1 className="text-2xl font-bold">{t("title")}</h1>
                        <p className="text-gray-500 dark:text-neutral-400 text-sm md:text-lg">{t("subtitle")}</p>
                    </div>

                    <div className="flex gap-2 dark:gap-1 dark:p-1 dark:rounded-full dark:border dark:border-dark-border">
                        <button type="button" onClick={() => setActive("earn")} className={`px-4 py-2 rounded-full text-sm ${active === "earn" ? "bg-black text-white dark:bg-[#D90404]" : "bg-white border dark:bg-transparent dark:border-transparent dark:text-white"}`}>
                            {t("tabEarn")}
                        </button>

                        <button type="button" onClick={() => setActive("topup")} className={`px-4 py-2 rounded-full text-sm ${active === "topup" ? "bg-black text-white dark:bg-[#D90404]" : "bg-white border dark:bg-transparent dark:border-transparent dark:text-white"}`}>
                            {t("tabTopUp")}
                        </button>

                        <button type="button" onClick={() => setActive("vip")} className={`px-4 py-2 rounded-full text-sm ${active === "vip" ? "bg-black text-white dark:bg-[#D90404]" : "bg-white border dark:bg-transparent dark:border-transparent dark:text-white"}`}>
                            {t("tabVip")}
                        </button>
                    </div>

                </div>

                {active !== "vip" && (
                    <div className="bg-linear-to-r space-y-4 from-black to-gray-900 dark:bg-none dark:bg-dark-card dark:border dark:border-dark-border text-white rounded-2xl p-6 md:flex items-center justify-between">
                        <div className="space-y-2">
                            <p className="text-sm md:text-base tracking-[0.2em] text-gray-300 dark:text-neutral-400 uppercase">{t("totalBalance")}</p>

                            <h2 className="text-4xl md:text-5xl font-bold flex items-center gap-3">
                                <Image
                                    src="/fang_pictures/balance.png"
                                    width={44}
                                    height={44}
                                    alt={t("coinBalance")}
                                />
                                {totalBalance.toLocaleString()}
                            </h2>

                            {/* Bought coins, bonus coins and gems on their own */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm md:text-base text-gray-300 dark:text-neutral-400">
                                <span>{t("coins", { amount: (wallet?.coins ?? 0).toLocaleString() })}</span>
                                <span>{t("bonus", { amount: (wallet?.bonusCoins ?? 0).toLocaleString() })}</span>
                                {isVip && (
                                    <span>{t("vipBonus", { amount: (wallet?.vipBonusCoins ?? 0).toLocaleString() })}</span>
                                )}
                                <span className="flex items-center gap-2">
                                    <Image src="/fang_pictures/gift-icons/ruby.png" width={22} height={22} alt={t("gems")} />
                                    <span className="text-white">{(wallet?.gems ?? 0).toLocaleString()}</span>
                                </span>

                            </div>
                        </div>
                        <div className="">
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setActive("topup")} className="bg-red-500 dark:bg-[#D90404] px-4 py-2 rounded-full text-xs md:text-sm">{t("plusTopUp")}</button>
                                <button onClick={() => router.push("/profile/transaction-history")} type="button" className="bg-white/10 dark:bg-neutral-800 px-4 py-2 rounded-full text-sm">{t("history")}</button>
                            </div>
                        </div>

                    </div>
                )}



                {/* EARN PAGE */}
                {/* {active === "earn" && (<EarnSection />)} */}
                {active === "earn" && (
                    <>
                        <EarnSection />
                        <InviteFriends />
                    </>
                )}
                {active === "topup" && (<CoinCard isVip />)}
                {active === "vip" && (<VipPlans />)}
            </div>
        </div>
    );
}