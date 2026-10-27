"use client";

import { Fragment, useEffect, useState } from "react";
import Image from "next/image";
import { useAuthStore } from "@/lib/store/authStore";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/store/toastStore";
import TopUpModal, { type TopUpPackage } from "./topUp";
import { VIP_TOPUP_PERCENT } from "@/lib/vipRates";

type CardProps = {
    isVip?: boolean; // ignored: VIP is read from the server
};

export default function CoinCard(_props: CardProps) {
    const user = useAuthStore((s) => s.user);
    const wallet = user?.wallet;
    // Coins bought with money + bonus coins + VIP bonus coins that haven't expired
    const balance = (wallet?.coins ?? 0) + (wallet?.bonusCoins ?? 0) + (wallet?.vipBonusCoins ?? 0);
    const t = useTranslations("Wallet");
    const [vipPercent, setVipPercent] = useState(0);
    const [selected, setSelected] = useState<TopUpPackage | null>(null);
    const isVip = vipPercent > 0;

    // Same columns for the header and every row. minmax(0,…) keeps a row's content
    // from resizing a column, so everything lines up exactly
    const cols = isVip
        ? "md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_7rem]"
        : "md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_7rem]";

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

                    {/* LEFT: one bordered table on PC */}
                    <div className="w-full lg:flex-1 lg:self-start md:rounded-xl md:border md:border-gray-200 md:bg-white md:overflow-hidden dark:bg-dark-card dark:rounded-lg dark:border dark:border-dark-border dark:overflow-hidden md:dark:bg-dark-card md:dark:border-dark-border">

                        {/* Header (PC only): same columns, px and gap as the rows */}
                        <div className={`hidden md:grid ${cols} items-center gap-4 px-6 py-4 border-b border-gray-100 dark:border-dark-border uppercase text-xs font-semibold text-gray-400 dark:text-white`}>
                            {/* coin 30px + gap 16px = 46px, so the title starts exactly over the number */}
                            <p className="pl-11.5">{t("baseCoins")}</p>
                            <p>{t("baseBonus")}</p>
                            {isVip && (<p className="text-red-500 font-bold">{t("vipBonusPercent", { percent: vipPercent })}</p>)}
                            <p>{t("totalCoins")}</p>
                            <p>{t("price")}</p>
                            <p></p>
                        </div>

                        <div className="flex flex-col gap-4 md:gap-0">
                            {coinPackages.map((item) => {
                                const vipBonus = Math.floor((item.coins * vipPercent) / 100);
                                const total = item.coins + item.bonus + vipBonus;
                                return (
                                    <Fragment key={item.coins}>
                                        {/* PHONE: one card per package */}
                                        <div className="md:hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-dark-border dark:bg-dark-card dark:shadow-none">
                                            {/* Coins and price */}
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex min-w-0 items-center gap-2.5">
                                                    <Image
                                                        src="/fang_pictures/coin-topup.png"
                                                        alt="coin"
                                                        width={32}
                                                        height={32}
                                                        className="shrink-0"
                                                    />
                                                    <h3 className="text-2xl font-semibold whitespace-nowrap">{item.coins}</h3>
                                                    <span className="text-base text-gray-500 dark:text-neutral-300">{t("coinsUnit")}</span>
                                                    {item.badge && (
                                                        <span className={`${item.badge === "BEST VALUE" ? "bg-neutral-900 dark:bg-neutral-600" : "bg-red-600"} text-white text-[8px] py-0.5 px-1 rounded-sm whitespace-nowrap`}>
                                                            {t(item.badge === "BEST VALUE" ? "bestValue" : "popular")}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="shrink-0 text-2xl font-bold">${item.price}</div>
                                            </div>

                                            {/* Bonus and VIP bonus side by side */}
                                            <div className="mt-5 grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm text-gray-500 dark:text-neutral-300">{t("baseBonus")}</p>
                                                    <p className="mt-1 text-xl font-semibold text-[#F0A500]">+{item.bonus}</p>
                                                </div>
                                                {isVip && (
                                                    <div>
                                                        <p className="text-sm text-red-600 dark:text-red-400">{t("vipBonusPercent", { percent: vipPercent })}</p>
                                                        <p className="mt-1 text-xl font-semibold text-red-600 dark:text-red-400">+{vipBonus}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Total */}
                                            <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-dark-border">
                                                <span className="text-sm text-gray-500 dark:text-neutral-300">{t("totalCoins")}</span>
                                                <span className="text-lg font-bold">{total.toLocaleString()} {t("coinsUnit")}</span>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => openTopUp(item)}
                                                className="mt-4 w-full rounded-xl bg-red-600 py-3 text-base font-semibold text-white transition hover:bg-red-700 dark:bg-red-800 dark:hover:bg-red-600">
                                                {t("tabTopUp")}
                                            </button>
                                        </div>

                                        {/* PC: the table row, unchanged */}
                                        <div className={`hidden md:grid ${cols} items-center gap-4 px-6 py-5 border-b border-gray-100 dark:border-dark-border last:border-b-0`}>
                                            <div className="flex items-center gap-4 min-w-0">
                                                <Image
                                                    src="/fang_pictures/coin-topup.png"
                                                    alt="coin"
                                                    width={30}
                                                    height={30}
                                                    className="shrink-0"
                                                />
                                                <div className="flex items-center gap-2 flex-wrap min-w-0">
                                                    <h3 className="font-semibold whitespace-nowrap">{item.coins}</h3>
                                                    {item.badge && (
                                                        <span className={`${item.badge === "BEST VALUE" ? "bg-neutral-900 dark:bg-neutral-600" : "bg-red-600"} text-white text-[8px] py-0.5 px-1 rounded-sm whitespace-nowrap`}>
                                                            {t(item.badge === "BEST VALUE" ? "bestValue" : "popular")}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-sm text-[#F0A500]">+{item.bonus}</div>

                                            {isVip && (
                                                <div className="text-sm text-red-500 font-semibold">+{vipBonus}</div>
                                            )}

                                            <div className="text-sm text-gray-500 dark:text-neutral-300">{total}</div>

                                            <div className="font-semibold text-base md:text-lg">${item.price}</div>

                                            <button
                                                type="button"
                                                onClick={() => openTopUp(item)}
                                                className="bg-red-600 hover:bg-red-600 dark:bg-red-800 dark:hover:bg-red-600 transition text-white px-2 py-1 text-base rounded-sm dark:rounded-md w-full justify-self-end">
                                                {t("tabTopUp")}
                                            </button>
                                        </div>
                                    </Fragment>
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