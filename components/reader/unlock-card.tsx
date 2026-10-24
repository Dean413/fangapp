"use client";

import Link from "next/link";
import { FaCheck } from "react-icons/fa6";
import { useTranslations } from "next-intl";

export interface UnlockCardProps {
    price: number;
    signedIn: boolean;
    wallet: { coins: number; bonusCoins: number } | null;
    unlocking: boolean;
    onUnlock: () => void;
    onSignIn: () => void;
    autoUnlock: boolean;
    autoBusy: boolean;
    onToggleAuto: () => void;
    dark?: boolean;
    firstLocked?: number | null
    onGoToFirst?: () => void;
    free?: boolean;
}

const WALLET_PATH = "/profile/wallet";

export default function UnlockCard({ price, firstLocked, free, onGoToFirst, signedIn, wallet, unlocking, onUnlock, onSignIn, autoUnlock, autoBusy, onToggleAuto, dark }: UnlockCardProps) {
    const coins = wallet?.coins ?? 0;
    const bonus = wallet?.bonusCoins ?? 0;
    const balance = coins + bonus;
    const short = Math.max(price - balance, 0);
    const enough = signedIn && (free || short === 0);
    const t = useTranslations("Reader");

    // Ads (2 ads unlock one chapter): set up later
    // const DAILY_LIMIT = 20;
    // const ADS_REQUIRED = 2;

    const buttonClass =
        "w-full rounded-full py-3 font-semibold text-white bg-linear-to-r from-[#8B0000] to-[#D90404] hover:opacity-90 transition disabled:opacity-60";

    return (
        <div className={`max-w-md mx-auto mt-10 ${dark ? "dark" : ""}`}>
            {/* Watch ads badge (ads come later)
            <div className="flex justify-end mb-3 pr-1">
                <div className="flex items-center gap-2 rounded-full border border-red-300 dark:border-red-500/40 bg-white dark:bg-dark-card px-4 py-2 shadow-sm">
                    <span className="rounded-md bg-linear-to-b from-red-500 to-red-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        AD
                    </span>
                    <span className="text-sm font-medium text-gray-800 dark:text-neutral-100">
                        Watch 2 ads to unlock: ({dailyAdsUsed}/{DAILY_LIMIT})
                    </span>
                </div>
            </div>
            */}

            {/* Main card */}
            <div className="relative bg-white dark:bg-dark-card w-[90%] mx-auto rounded-3xl border-t-4 border-red-800 overflow-hidden shadow-sm">
                <div className="p-8 text-center">
                    {/* Lock icon */}
                    <div className="flex justify-center mb-3">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-9 w-9 text-gray-700 dark:text-neutral-200"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.75}>
                            <rect x="5" y="11" width="14" height="9" rx="2" />
                            <path d="M8 11V7a4 4 0 118 0v4" />
                        </svg>
                    </div>

                    {/* Amount */}
                    {/* Amount */}
                    <div className="text-3xl font-extrabold text-gray-900 dark:text-white">{free ? t("free") : price}</div>
                    <p className="mt-1 mb-6 text-sm text-gray-500 dark:text-neutral-400">{free ? t("vipFreeUnlock") : t("coinsOrBonus")}</p>

                    {/* Unlock / sign in / top up */}
                    {signedIn && firstLocked ? (
                        // An earlier paid chapter is still locked: that one first
                        <>
                            <p className="mb-3 text-sm text-gray-700 dark:text-neutral-300">
                                {t("unlockEarlierFirst", { chapter: firstLocked })}
                            </p>
                            <button type="button" onClick={onGoToFirst} className={buttonClass}>
                                {t("goToChapter", { chapter: firstLocked })}
                            </button>
                        </>
                    ) : !signedIn ? (
                        <button type="button" onClick={onSignIn} className={buttonClass}>
                            {t("signInToUnlock")}
                        </button>
                    ) : enough ? (
                        <button type="button" onClick={onUnlock} disabled={unlocking} className={buttonClass}>
                            {unlocking ? t("unlocking") : t("unlock")}
                        </button>
                    ) : (
                        <>
                            <Link href={WALLET_PATH} className={`${buttonClass} block`}>
                                {t("topUp")}
                            </Link>
                            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                                {t("needMore", { count: short })}
                            </p>
                        </>
                    )}

                    {/* Ads unlock (later)
                    <Button onClick={onWatchAd} disabled={unlocking} label="Watch Ad (0/2)" />
                    */}

                    {/* Balance */}
                    {signedIn && (
                        <div className="mt-4 text-sm text-gray-600 dark:text-neutral-300">
                            {t("balance")}{" "}
                            <span className="font-semibold text-gray-900 dark:text-white">{t("coinsAmount", { amount: coins.toLocaleString() })}</span>
                            <span className="ml-4 font-semibold text-gray-900 dark:text-white">{t("bonusAmount", { amount: bonus.toLocaleString() })}</span>
                        </div>
                    )}

                    {/* Auto-unlock */}
                    {signedIn && (
                        <div className="mt-6 flex items-center justify-center">
                            <button type="button" onClick={onToggleAuto} disabled={autoBusy} aria-pressed={autoUnlock}
                                className="flex items-center gap-2 whitespace-nowrap disabled:opacity-60">
                                <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition
                                    ${autoUnlock ? "bg-red-600 border-red-600" : "border-gray-300 dark:border-neutral-600"}`}>
                                    {autoUnlock && <FaCheck color="white" size={10} />}
                                </span>
                                <span className="text-sm font-medium text-gray-800 dark:text-neutral-200">
                                    {t("autoUnlock")}
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

