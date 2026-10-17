"use client";

import Image from "next/image";
import { useState } from "react";

interface SelectionCardProps {
    plan: "weekly" | "monthly";
    isVip?: boolean;
}


export default function SelectionCard({ plan, isVip }: SelectionCardProps) {

    const coinPackages = [
        {
            coins: 500,
            bonus: 50,
            vipBonus: plan === "weekly" ? 50 : 75,
            total: 600,
            price: 4.99,
        },
        {
            coins: 1000,
            bonus: 150,
            vipBonus: plan === "weekly" ? 100 : 150,
            total: 1250,
            price: 9.99,
            badge: "POPULAR",
        },
        {
            coins: 2000,
            bonus: 550,
            vipBonus: plan === "weekly" ? 200 : 300,
            total: 2750,
            price: 19.99,
        },
        {
            coins: 3500,
            bonus: 1500,
            vipBonus: plan === "weekly" ? 350 : 525,
            total: 5300,
            price: 34.99,

        },
        {
            coins: 4000,
            bonus: 1850,
            vipBonus: plan === "weekly" ? 400 : 600,
            total: 6250,
            price: 39.99,
            badge: "BEST VALUE",
        },
    ];
    return (
        <div className="bg-[#fafafa] dark:bg-dark min-h-screen ">
            <div className="max-w-7xl mx-auto">
                <div className="bg-linear-to-r from-black to-gray-900 dark:bg-none dark:bg-dark-card text-white rounded-2xl px-6 py-1 md:flex items-center justify-between">
                    <div className="flex items-center gap-2 md:gap-8">
                        <h2 className="text-4xl font-bold flex items-center gap-2">
                            <Image
                                src="/fang_pictures/vip.png"
                                width={120}
                                height={120}
                                alt="coin balance"
                            />
                        </h2>

                        <div>
                            <p className="text-xl">Current Plan</p>
                            <div className="md:flex items-center gap-8">
                                <p className="text-xl md:text-3xl font-bold text-yellow-400">{plan === "weekly" ? "Weekly VIP" : "Monthly VIP"}</p>
                                <div className="inline-flex items-center justify-center rounded-full px-4 py-1
                                        bg-linear-to-b from-yellow-200 via-yellow-300 to-yellow-400
                                        border border-yellow-500
                                        shadow-[0_6px_16px_rgba(0,0,0,0.15)]
                                        ring-2 ring-yellow-200/50">
                                    <span className="font-bold text-yellow-950 dark:text-yellow-300 text-xs md:text-xl">Best Value</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="">
                        <p className="text-xs">Renews on</p>
                        <p className="text-xl">June 2025</p>
                    </div>

                </div>

                <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* LEFT */}
                    <div className="lg:col-span-3">
                        {/* Desktop Heading */}
                        <div className="hidden md:grid grid-cols-6 gap-4 px-5 mb-3 text-xs uppercase text-gray-400 dark:text-neutral-500 font-semibold">
                            <p>Base Coins</p>
                            <p>Base Bonus</p>

                            {isVip && (
                                <p className="text-red-500">
                                    {plan === "weekly" ? "VIP Bonus (+10%)" : "VIP Bonus (+15%)"}
                                </p>
                            )}

                            <p>Total Coins</p>
                            <p>Price</p>
                            <p></p>
                        </div>

                        <div className="space-y-4">
                            {coinPackages.map((item) => (
                                <div key={item.coins} className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm p-5">
                                    {/* Desktop */}
                                    <div className="hidden md:grid grid-cols-6 gap-4 items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <Image
                                                    src="/fang_pictures/coin-topup.png"
                                                    alt="coin"
                                                    width={32}
                                                    height={32}
                                                />

                                                {item.badge && (
                                                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] px-2 py-1 rounded-full whitespace-nowrap">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </div>

                                            <span className="font-semibold">
                                                {item.coins} Coins
                                            </span>
                                        </div>

                                        <p className={`${item.bonus === 50 ? "text-gray-500 dark:text-neutral-400" : ""}`}>+{item.bonus}</p>

                                        {isVip && (
                                            <p className="text-red-500 font-semibold">
                                                +{item.vipBonus}
                                            </p>
                                        )}

                                        <p>{item.total} coins</p>

                                        <p className="font-bold">
                                            ${item.price}
                                        </p>

                                        <button className="bg-red-500 hover:bg-red-600 text-white rounded-xl py-2 px-5">
                                            Top Up
                                        </button>
                                    </div>

                                    {/* Mobile */}
                                    <div className="md:hidden">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="relative">
                                                <Image
                                                    src="/fang_pictures/coin-topup.png"
                                                    alt="coin"
                                                    width={32}
                                                    height={32}
                                                />

                                                {item.badge && (
                                                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] px-2 py-1 rounded-full whitespace-nowrap">
                                                        {item.badge}
                                                    </span>
                                                )}

                                            </div>

                                            <h3 className="font-bold text-lg">
                                                {item.coins} Coins
                                            </h3>

                                        </div>

                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span>Base Bonus</span>
                                                <span className={`${item.bonus === 50 ? "text-gray-500 dark:text-neutral-400" : ""}`}>+{item.bonus}</span>
                                            </div>

                                            {isVip && (
                                                <div className="flex justify-between">
                                                    <span>VIP Bonus</span>
                                                    <span className="text-red-500 font-semibold">
                                                        +{item.vipBonus}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex justify-between">
                                                <span>Total Coins</span>
                                                <span className="text-gray-500 dark:text-neutral-400">{item.total} coins</span>
                                            </div>

                                            <div className="flex justify-between font-bold text-lg mt-3">
                                                <span>Price</span>
                                                <span>${item.price}</span>
                                            </div>

                                        </div>

                                        <button className="w-full mt-5 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl">
                                            Top Up
                                        </button>

                                    </div>

                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT SIDEBAR */}
                    <div className="lg:col-span-1">
                        {/* Keep your existing benefits section exactly as it is */}
                        <div className="w-full lg:w-60">
                            <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden shadow-sm">

                                {/* Top Banner */}
                                <div className="bg-purple-100 dark:bg-purple-500/15 px-4 py-4">
                                    <div className="flex items-center justify-between">
                                        <Image
                                            src="/fang_pictures/treasure-chest.png"
                                            alt="coin chest"
                                            width={90}
                                            height={90}
                                        />
                                        <div className="text-center">
                                            <p className="text-3xl font-bold text-red-400">2.1x</p>
                                            <p className="text-xs text-gray-500 dark:text-neutral-400">more value on</p>
                                            <p className="text-xs text-gray-500 dark:text-neutral-400">Top Up</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-5">
                                    <div className="flex items-center gap-3 mb-6">
                                        {plan === "weekly" ? (
                                            <Image
                                                src="/fang_pictures/weekly-vip-crown.png"
                                                alt="crown"
                                                width={50}
                                                height={50}
                                            />
                                        ) : (
                                            <Image
                                                src="/fang_pictures/monthly-vip-crown.png"
                                                alt="crown"
                                                width={50}
                                                height={50}
                                            />
                                        )}

                                        <h3 className="font-semibold text-xl">
                                            {plan === "weekly" ? "Weekly Vip Benefits" : "Monthly Vip Benefits"}
                                        </h3>
                                    </div>

                                    <ul className="space-y-4 text-sm text-gray-600 dark:text-neutral-300">
                                        <li className="flex items-center gap-2">
                                            <span className="text-green-500">✓</span> {plan === "weekly" ? "Daily bonus coin" : "Larger daily coins"}
                                        </li>

                                        <li className="flex items-center gap-2">
                                            <span className="text-green-500">✓</span>{plan === "weekly" ? "Reduced ads" : "Bigger top up bonus"}
                                        </li>

                                        <li className="flex items-center gap-2">
                                            <span className="text-green-500">✓</span>{plan === "weekly" ? "Early chapter access" : "Better chapter discounts"}
                                        </li>

                                        <li className="flex items-center gap-2">
                                            <span className="text-green-500">✓</span>{plan === "weekly" ? "Small top up bonus" : "Exclusive contents"}
                                        </li>

                                        <li className="flex items-center gap-2">
                                            <span className="text-green-500">✓</span>{plan === "weekly" ? "Vip badge" : "Higher monthly value"}
                                        </li>

                                        <li className="flex items-center gap-2">
                                            <span className="text-green-500">
                                                {plan === "monthly" && (
                                                    "✓"
                                                )}
                                            </span>{plan === "weekly" ? "" : "Priority access to premium stories"}
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}