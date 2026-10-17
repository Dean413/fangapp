"use client";

import Image from "next/image";
import { useAuthStore } from "@/lib/store/authStore";


type CardProps = {
    isVip?: boolean;
}
export default function CoinCard({ isVip }: CardProps) {
    const wallet = useAuthStore((s) => s.user?.wallet);
    // Coins bought with money + bonus coins that haven't expired
    const balance = (wallet?.coins ?? 0) + (wallet?.bonusCoins ?? 0);

    const coinPackages = [
        {
            coins: 500,
            bonus: 50,
            vipBonus: 50,
            total: 550,
            price: 4.99,
        },
        {
            coins: 1000,
            bonus: 150,
            vipBonus: 100,
            total: 1150,
            price: 9.99,
            badge: "POPULAR",
        },
        {
            coins: 2000,
            bonus: 550,
            vipBonus: 200,
            total: 2550,
            price: 19.99,
        },
        {
            coins: 3500,
            bonus: 1500,
            vipBonus: 350,
            total: 5000,
            price: 34.99,

        },
        {
            coins: 4000,
            bonus: 1850,
            vipBonus: 400,
            total: 5850,
            price: 39.99,
            badge: "BEST VALUE",
        },
    ];
    return (
        <div className="bg-[#fafafa] dark:bg-dark min-h-screen ">

            <div className="max-w-7xl mx-auto">
                <div className="mt-8 flex flex-col lg:flex-row gap-6">

                    {/* LEFT (one bordered table in dark mode) */}
                    <div className="flex-1 self-start dark:bg-dark-card dark:rounded-lg dark:border dark:border-dark-border dark:overflow-hidden">
                        {/* Coin Tabs */}
                        <div className="flex w-157.5 ml-6 bh px-2 mb-3 items-center uppercase text-xs text-center text-gray-400 justify-between dark:mb-0 dark:py-3 dark:font-semibold dark:text-white">
                            <p>Base Coins</p>
                            <p className="ml-8">Base Bonus</p>
                            {isVip && (<p className="text-red-500 uppercase font-bold">Vip Bonus(+10%)</p>)}
                            <p>Total Coins</p>
                            <p>Price</p>
                        </div>

                        <div className="space-y-4 dark:space-y-0 dark:border-t dark:border-dark-border dark:divide-y dark:divide-dark-border">
                            {coinPackages.map((item) => (
                                <div key={item.coins} className="bg-white dark:bg-dark-card rounded-2xl dark:rounded-none border border-gray-100 dark:border-0 py-4 flex items-center justify-between px-2 shadow-sm dark:shadow-none">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <Image
                                                src="/fang_pictures/coin-topup.png"
                                                alt="coin"
                                                width={30}
                                                height={30}
                                            />

                                            {item.badge && (
                                                <span className={`absolute -bottom-6 left-8/3 -translate-x-1/2 bg-red-500 ${item.badge === "BEST VALUE" ? "dark:bg-neutral-600" : ""} text-white text-[10px] py-1 px-3 rounded-full whitespace-nowrap`}>
                                                    {item.badge}
                                                </span>
                                            )}
                                        </div>

                                        <div>
                                            <h3 className="font-semibold">
                                                {item.coins} Coins
                                            </h3>
                                        </div>
                                    </div>

                                    <div className="hidden md:block text-sm text-[#F0A500]">
                                        +{item.bonus} Bonus
                                    </div>

                                    {isVip && (
                                        <div className="hidden md:block text-sm text-red-500 font-semibold">
                                            +{item.vipBonus} Bonus
                                        </div>
                                    )}


                                    <div className="hidden md:block text-sm text-gray-500 dark:text-neutral-300">
                                        Total {item.total} Coins
                                    </div>

                                    <div className="font-semibold text-lg">
                                        ${item.price}
                                    </div>

                                    <button type="button" className="bg-red-500 hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-600 transition text-white px-5 py-2 rounded-xl dark:rounded-md">
                                        Top Up
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT SIDEBAR */}
                    <div className="w-full lg:w-75 space-y-5">
                        {/* Balance Card */}
                        <div className="bg-white dark:bg-transparent rounded-2xl border border-gray-100 dark:border-0 overflow-hidden">
                            <div className="bg-linear-to-b from-[#FAEDED00] to-[#eab9b999] dark:bg-none">
                                <div className="p-5 dark:px-0">
                                    <p className="text-sm text-gray-500 dark:text-neutral-300">Current Balance</p>

                                    <div className="flex items-center gap-2 mt-2">
                                        <Image src="/fang_pictures/coin-topup.png" alt="coin-balance" width={40} height={40} />
                                        <h2 className="text-4xl font-bold">{balance.toLocaleString()} <span className="text-[18px]">coins</span></h2>
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
                                    Why Top up on web?
                                </h3>

                                <ul className="space-y-2 text-sm text-gray-500 dark:text-neutral-300">
                                    <li>✓ Better value than app</li>
                                    <li>✓ Bonus coins included</li>
                                    <li>✓ Instant delivery</li>
                                    <li>✓ Secure payments</li>
                                </ul>
                            </div>
                        </div>


                    </div>
                </div>
            </div>
        </div>
    );
}