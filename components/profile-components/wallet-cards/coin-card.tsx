"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useAuthStore } from "@/lib/store/authStore";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/store/toastStore";
import TopUpModal, { type TopUpPackage } from "./topUp";

type CardProps = {
    isVip?: boolean; // ignored: VIP is read from the server
};

// Extra coins a VIP gets on top-ups: weekly 10%, monthly 15%
const VIP_TOPUP_PERCENT: Record<string, number> = { weekly: 10, monthly: 15 };

export default function CoinCard(_props: CardProps) {
    const user = useAuthStore((s) => s.user);
    const wallet = user?.wallet;
    // Coins bought with money + bonus coins that haven't expired
    const balance = (wallet?.coins ?? 0) + (wallet?.bonusCoins ?? 0);
    const t = useTranslations("Wallet");
    const [vipPercent, setVipPercent] = useState(0);
    const [selected, setSelected] = useState<TopUpPackage | null>(null);
    const isVip = vipPercent > 0;

    // Same columns for the header and every row, so they always line up
    const cols = isVip
        ? "md:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr_7rem]"
        : "md:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_7rem]";

    useEffect(() => {
        let alive = true;
        fetch("/api/vip/status", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (!alive || !data) return;
                const s = data.vip ?? data;
                setVipPercent(s.active ? VIP_TOPUP_PERCENT[s.plan] ?? 0 : 0);
            })
            .catch(() => { });
        return () => {
            alive = false;
        };
    }, []);

    const coinPackages = [
        { coins: 500, bonus: 50, price: 4.99 },
        { coins: 1000, bonus: 150, price: 9.99, badge: "POPULAR" },
        { coins: 2000, bonus: 550, price: 19.99 },
        { coins: 3500, bonus: 1500, price: 34.99 },
        { coins: 4000, bonus: 1850, price: 39.99, badge: "BEST VALUE" },
    ];

    function openTopUp(item: TopUpPackage) {
        if (!user) {
            toast.error(t("signInToClaim"));
            return;
        }
        setSelected({ coins: item.coins, bonus: item.bonus, price: item.price });
    }

    return (
        <div className="bg-[#fafafa] dark:bg-dark min-h-screen ">

            <div className="max-w-7xl mx-auto">
                <div className="mt-8 flex flex-col lg:flex-row gap-6">

                    {/* LEFT (one bordered table in dark mode) */}
                    <div className="flex-1 self-start dark:bg-dark-card dark:rounded-lg dark:border dark:border-dark-border dark:overflow-hidden">
                        {/* Coin Tabs */}
                        <div className={`hidden md:grid ${cols} gap-4 px-2 mb-3 items-center uppercase text-xs text-gray-400 dark:mb-0 dark:py-3 dark:font-semibold dark:text-white`}>
                            <p className="pl-12">{t("baseCoins")}</p>
                            <p>{t("baseBonus")}</p>
                            {isVip && (<p className="text-red-500 uppercase font-bold">{t("vipBonusPercent", { percent: vipPercent })}</p>)}
                            <p>{t("totalCoins")}</p>
                            <p>{t("price")}</p>
                            <p></p>
                        </div>

                        <div className="space-y-4 dark:space-y-0 dark:border-t dark:border-dark-border dark:divide-y dark:divide-dark-border">
                            {coinPackages.map((item) => {
                                const vipBonus = Math.floor((item.coins * vipPercent) / 100);
                                const total = item.coins + item.bonus + vipBonus;
                                return (
                                    <div key={item.coins} className={`bg-white dark:bg-dark-card rounded-2xl dark:rounded-none border border-gray-100 dark:border-0 py-4 flex md:grid ${cols} md:gap-4 items-center justify-between gap-3 px-2 shadow-sm dark:shadow-none`}>
                                        <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                                            <div className="relative shrink-0">
                                                <Image
                                                    src="/fang_pictures/coin-topup.png"
                                                    alt="coin"
                                                    width={30}
                                                    height={30}
                                                />

                                                {/* PC: badge under the coin */}
                                                {item.badge && (
                                                    <span className={`hidden md:inline absolute -bottom-6 left-8/3 -translate-x-1/2 bg-red-500 ${item.badge === "BEST VALUE" ? "dark:bg-neutral-600" : ""} text-white text-[10px] py-1 px-3 rounded-full whitespace-nowrap`}>
                                                        {t(item.badge === "BEST VALUE" ? "bestValue" : "popular")}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-semibold whitespace-nowrap">
                                                        {t("coinsCount", { count: item.coins })}
                                                    </h3>
                                                    {/* Mobile: badge next to the title */}
                                                    {item.badge && (
                                                        <span className={`md:hidden bg-red-500 ${item.badge === "BEST VALUE" ? "dark:bg-neutral-600" : ""} text-white text-[10px] py-0.5 px-2 rounded-full whitespace-nowrap`}>
                                                            {t(item.badge === "BEST VALUE" ? "bestValue" : "popular")}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Mobile: the details the PC row shows in its own columns */}
                                                <div className="md:hidden mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs">
                                                    <span className="text-[#F0A500]">{t("plusBonus", { count: item.bonus })}</span>
                                                    {isVip && (
                                                        <span className="text-red-500 font-semibold">{t("plusVipBonus", { count: vipBonus })}</span>
                                                    )}
                                                    <span className="text-gray-500 dark:text-neutral-300">{t("totalCount", { count: total })}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="hidden md:block text-sm text-[#F0A500]">
                                            {t("plusBonus", { count: item.bonus })}
                                        </div>

                                        {isVip && (
                                            <div className="hidden md:block text-sm text-red-500 font-semibold">
                                                {t("plusVipBonus", { count: vipBonus })}
                                            </div>
                                        )}

                                        <div className="hidden md:block text-sm text-gray-500 dark:text-neutral-300">
                                            {t("totalCount", { count: total })}
                                        </div>

                                        {/* Mobile: price and button together on the right. PC: they stay separate columns */}
                                        <div className="flex flex-col items-end gap-2 shrink-0 md:contents">
                                            <div className="font-semibold text-base md:text-lg">
                                                ${item.price}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => openTopUp(item)}
                                                className="bg-red-500 hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-600 transition text-white px-4 py-1.5 text-sm md:text-base md:px-5 md:py-2 rounded-xl dark:rounded-md md:w-full"
                                            >
                                                {t("tabTopUp")}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* RIGHT SIDEBAR */}
                    <div className="w-full lg:w-75 space-y-5">
                        {/* Balance Card */}
                        <div className="bg-white dark:bg-transparent rounded-2xl border border-gray-100 dark:border-0 overflow-hidden">
                            <div className="bg-linear-to-b from-[#FAEDED00] to-[#eab9b999] dark:bg-none">
                                <div className="p-5 dark:px-0">
                                    <p className="text-sm text-gray-500 dark:text-neutral-300">{t("currentBalance")}</p>

                                    <div className="flex items-center gap-2 mt-2">
                                        <Image src="/fang_pictures/coin-topup.png" alt="coin-balance" width={40} height={40} />
                                        <h2 className="text-4xl font-bold">{balance.toLocaleString()} <span className="text-[18px]">{t("coinsUnit")}</span></h2>
                                    </div>

                                </div>

                                <div className=" p-4 dark:bg-[#2a1414]">
                                    <Image
                                        src="/fang_pictures/treasure-chest.png"
                                        alt="wallet"
                                        width={250}
                                        height={150}
                                        className="mx-auto"
                                    />
                                </div>

                            </div>

                            <div className="p-5 dark:border dark:border-neutral-500 dark:rounded-b-md">
                                <h3 className="font-semibold mb-3">
                                    {t("whyWeb")}
                                </h3>

                                <ul className="space-y-2 text-sm text-gray-500 dark:text-neutral-300">
                                    <li>✓ {t("whyValue")}</li>
                                    <li>✓ {t("whyBonus")}</li>
                                    <li>✓ {t("whyInstant")}</li>
                                    <li>✓ {t("whySecure")}</li>
                                </ul>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <TopUpModal pkg={selected} vipPercent={vipPercent} onClose={() => setSelected(null)} />
        </div>
    );
}