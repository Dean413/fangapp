"use client"
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { FaVideo } from "react-icons/fa";
import { useTranslations } from "next-intl";


type SocialCardProps = {
    platform: string;
    icon: React.ReactNode;
}

type EngageMentCardProps = {
    target: number;
    icon: React.ReactNode
    progress: number;
    showProgress: boolean
    title: string;
    coins: number;
    text?: string;

}

type SectionTitle = {
    title: React.ReactNode
}

export function SectionTitle({ title }: SectionTitle) {
    return (
        <h2 className="text-lg font-semibold mt-6">{title}</h2>
    );
}


export function EngagementItem({ title, progress, coins, text, showProgress, target, icon }: EngageMentCardProps) {
    const displayProgress = target ? `${progress}/${target}` : null;
    const percentage = target ? (progress / target) * 100 : 0;
    return (
        <div className="bg-white dark:bg-dark-card p-4 rounded-xl border border-gray-400 dark:border-neutral-600 flex justify-between items-center">
            <div className="flex items-center gap-4 w-full">
                <div>{icon}</div>

                <div>
                    <p className="font-medium mb-2">{title}</p>
                    <p className="text-gray-500 dark:text-neutral-400 text-sm">{text}</p>

                    {showProgress && (
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            {showProgress && (
                                <div className="h-2 w-32 bg-gray-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-500 transition-all" style={{ width: `${percentage}%` }} />
                                </div>
                            )}
                            <div className="flex justify-between text-xs text-gray-500 dark:text-neutral-400">
                                <span>{displayProgress}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <p className="text-orange-500 font-semibold">
                +{coins}
            </p>
        </div>
    );
}

export function SocialItem({ platform, icon }: SocialCardProps) {
    const t = useTranslations("Wallet");
    return (
        <div className="bg-white dark:bg-dark-card p-4 rounded-xl border border-gray-400 dark:border-neutral-600 flex items-center justify-between">
            <div className="flex gap-2 items-center">
                <div>{icon}</div>
                <p className="font-medium">{t("followOn", { platform })}</p>
            </div>


            <button className="px-4 py-1 bg-red-500 text-white rounded-full text-sm">
                {t("claim")}
            </button>
        </div>
    );
}