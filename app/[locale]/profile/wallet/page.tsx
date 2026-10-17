"use client";

import CoinCard from "@/components/profile-components/wallet-cards/coin-card";
import EarnSection from "@/components/profile-components/wallet-cards/earn-section";
import VipPlans from "@/components/profile-components/wallet-cards/vip";
import { useWalletStore } from "@/lib/store/wallet-action-store";
import { useAuthStore } from "@/lib/store/authStore";
import Image from "next/image";

export default function WalletPage() {
    const { active, setActive } = useWalletStore()
    const wallet = useAuthStore((s) => s.user?.wallet)
    // Coins bought with money + bonus coins that haven't expired
    const totalBalance = (wallet?.coins ?? 0) + (wallet?.bonusCoins ?? 0)

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark p-6">

            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="md:flex items-center justify-between space-y-2 md">
                    <div>
                        <h1 className="text-2xl font-bold">My Wallet</h1>
                        <p className="text-gray-500 dark:text-neutral-400 text-sm md:text-lg">Earn, top up and manage your VIP perks</p>
                    </div>

                    <div className="flex gap-2 dark:gap-1 dark:p-1 dark:rounded-full dark:border dark:border-dark-border">
                        <button type="button" onClick={() => setActive("earn")} className={`px-4 py-2 rounded-full text-sm ${active === "earn" ? "bg-black text-white dark:bg-[#D90404]" : "bg-white border dark:bg-transparent dark:border-transparent dark:text-white"}`}>
                            Earn
                        </button>

                        <button type="button" onClick={() => setActive("topup")} className={`px-4 py-2 rounded-full text-sm ${active === "topup" ? "bg-black text-white dark:bg-[#D90404]" : "bg-white border dark:bg-transparent dark:border-transparent dark:text-white"}`}>
                            Top Up
                        </button>

                        <button type="button" onClick={() => setActive("vip")} className={`px-4 py-2 rounded-full text-sm ${active === "vip" ? "bg-black text-white dark:bg-[#D90404]" : "bg-white border dark:bg-transparent dark:border-transparent dark:text-white"}`}>
                            VIP
                        </button>
                    </div>

                </div>

                {active !== "vip" && (
                    <div className="bg-linear-to-r space-y-4 from-black to-gray-900 dark:bg-none dark:bg-dark-card dark:border dark:border-dark-border text-white rounded-2xl p-6 md:flex items-center justify-between">
                        <div className="fle items-center gap-4">
                            <p className="text-xl text-gray-300 dark:text-neutral-400">TOTAL BALANCE</p>

                            <h2 className="text-4xl font-bold flex items-center gap-2">
                                <Image
                                    src="/fang_pictures/balance.png"
                                    width={30}
                                    height={30}
                                    alt="coin balance"
                                />
                                {totalBalance.toLocaleString()}
                            </h2>
                        </div>
                        <div className="">
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setActive("topup")} className="bg-red-500 dark:bg-[#D90404] px-4 py-2 rounded-full text-xs md:text-sm">+ Top Up</button>
                                <button type="button" className="bg-white/10 dark:bg-neutral-800 px-4 py-2 rounded-full text-sm">History</button>
                            </div>
                        </div>

                    </div>
                )}



                {/* EARN PAGE */}
                {active === "earn" && (<EarnSection />)}
                {active === "topup" && (<CoinCard isVip />)}
                {active === "vip" && (<VipPlans />)}
            </div>
        </div>
    );
}