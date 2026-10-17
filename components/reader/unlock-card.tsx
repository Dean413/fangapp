"use client";

import { FaCheck } from "react-icons/fa6";
import { Button } from "../Button";

interface Props {
    unlocking: boolean;
    onUnlock: () => void;
}

export default function UnlockCard({ unlocking, onUnlock }: Props) {

    const DAILY_LIMIT = 20;
    const dailyAdsUsed = DAILY_LIMIT
    const ADS_REQUIRED = 2;


    return (
        <div className="max-w-md mx-auto mt-10">
            {/* Watch ads badge */}
            <div className="flex justify-end mb-3 pr-1">
                <div className="flex items-center gap-2 rounded-full border border-red-300 dark:border-red-500/40 bg-white dark:bg-dark-card px-4 py-2 shadow-sm">
                    <span className="rounded-md bg-linear-to-b from-red-500 to-red-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        AD
                    </span>
                    {/* <span className="text-sm font-medium text-gray-800 dark:text-neutral-100">
                        Watch 2 ads to unlock ({adsWatched}/{totalAds})
                    </span> */}

                    <span className="text-sm font-medium text-gray-800 dark:text-neutral-100">
                        Watch 2 ads to unlock: ({dailyAdsUsed}/{DAILY_LIMIT})
                        {/* Chapter: ({adsWatchedForChapter}/{ADS_REQUIRED}) */}
                    </span>
                </div>
            </div>

            {/* Main card */}
            <div className="relative bg-white dark:bg-dark-card w-[90%] mx-auto rounded-3xl border-t-4 border-red-800 overflow-hidden">
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
                    <div className="text-3xl font-extrabold text-gray-900 dark:text-white"> 20</div>
                    <p className="mt-1 mb-4 text-sm text-gray-500 dark:text-neutral-400">Coins or Bonus</p>

                    {/* {reachedLimit ? (
                        <div className="mt-6">
                            <p className="text-red-500 font-semibold">
                                Daily limit reached.
                            </p>
                            <p className="text-gray-500 dark:text-neutral-400 text-sm mt-2">
                                Come back tomorrow.
                            </p>
                        </div>
                    ) : ( */}
                    <>
                        {/* Unlock button */}
                        {/* <Button
                                onClick={onUnlock}
                                disabled={unlocking}
                                label={unlocking ? "Watching Ad..." : "Unlock"}
                            /> */}

                        <Button
                            onClick={onUnlock}
                            disabled={unlocking}
                            label="Watch Ad (0/2)"
                        />



                        {/* Balance */}
                        <div className="mt-4 text-sm text-gray-600 dark:text-neutral-300">
                            Balance:{" "}
                            <span className="font-semibold text-gray-900 dark:text-white">0 Coins</span>{" "}
                            <span className="font-semibold text-gray-900 dark:text-white">15 Bonus</span>
                        </div>

                        {/* Auto-unlock divider */}
                        <div className="mt-6 flex items-center justify-center">

                            <div className="mx-3 flex items-center gap-2 whitespace-nowrap">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600">
                                    <FaCheck color="white" />
                                </span>
                                <span className="text-sm font-medium text-blue-500">
                                    Auto-Unlock Next Chapter
                                </span>
                            </div>

                        </div>
                    </>
                    {/* )} */}

                </div>
            </div>
        </div>
    );
}