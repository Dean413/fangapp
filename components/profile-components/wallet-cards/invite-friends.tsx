"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Share2, Users } from "lucide-react";

type Stats = { code: string; joined: number; rewarded: number; coins: number; rewardCoins: number; maxRewards: number };

export default function InviteFriends() {
    const t = useTranslations("Referral");
    const [stats, setStats] = useState<Stats | null>(null);
    const [failed, setFailed] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetch("/api/referral", { cache: "no-store" })
            .then(async (res) => {
                if (!res.ok) throw new Error();
                setStats(await res.json());
            })
            .catch(() => setFailed(true));
    }, []);

    if (failed || !stats) return null;

    const link = `${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${stats.code}`;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* the link stays visible to copy by hand */
        }
    };

    const share = async () => {
        if (typeof navigator !== "undefined" && "share" in navigator) {
            try {
                await navigator.share({ url: link, text: t("shareText") });
                return;
            } catch {
                /* cancelled: nothing to do */
            }
            return;
        }
        await copy();
    };

    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-dark-border dark:bg-dark-card">
            <div className="flex items-center gap-2">
                <Users size={20} className="text-red-500" />
                <h2 className="text-lg font-semibold">{t("title")}</h2>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
                {t("text", { coins: stats.rewardCoins })}
            </p>

            <div className="mt-4 flex items-center gap-2">
                <input
                    readOnly
                    value={link}
                    onFocus={(e) => e.currentTarget.select()}
                    className="min-w-0 flex-1 truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-dark-border dark:bg-dark"
                />
                <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-sm text-white dark:bg-[#D90404]">
                    <Copy size={14} /> {copied ? t("copied") : t("copy")}
                </button>
                <button type="button" onClick={share} aria-label={t("share")} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-2 text-sm dark:border-dark-border">
                    <Share2 size={14} />
                </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600 dark:text-neutral-300">
                <span>{t("joined", { count: stats.joined })}</span>
                <span>{t("rewarded", { count: stats.rewarded, max: stats.maxRewards })}</span>
                <span>{t("earned", { coins: stats.coins })}</span>
            </div>
        </div>
    );
}