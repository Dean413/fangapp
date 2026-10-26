"use client";

import { useRouter } from "next/navigation";
import { FaLock } from "react-icons/fa6";
import { useTranslations } from "next-intl";
import { useState } from "react";

// Chapters shown per tab in the table of contents
const RANGE_SIZE = 100;

export default function TocSheet({ chapters, currentChapter, onClose }: any) {
    // Opens on the range that has the chapter being read
    const [range, setRange] = useState(() => {
        const at = (chapters ?? []).findIndex((c: any) => Number(c.chapter_number) === Number(currentChapter));
        return at >= 0 ? Math.floor(at / RANGE_SIZE) : 0;
    });
    const router = useRouter();
    const r = useTranslations("Reader");
    const t = useTranslations("Book");

    const list: any[] = chapters ?? [];
    const rangeCount = Math.ceil(list.length / RANGE_SIZE);

    return (
        <div className="fixed inset-0 z-50 flex">
            {/* CLICK OUTSIDE */}
            <div className="flex-1" onClick={onClose} />

            {/* PANEL */}
            <div className="w-80 md:w-105 fixed md:right-15 right-5 top-1/2 -translate-y-1/2 bg-white dark:bg-dark-card rounded-xl shadow-xl p-4 z-50">
                <h2 className="text-center border-b border-gray-300 dark:border-neutral-700 pb-3 font-bold mb-4">{t("contents")}</h2>

                {/* key: a new range starts at the top of the list */}
                <div key={range} className="flex flex-col gap-2 max-h-100 overflow-y-auto no-scrollbar">
                    {list.slice(range * RANGE_SIZE, (range + 1) * RANGE_SIZE).map((ch: any) => (
                        <button
                            key={ch.chapter_number}
                            onClick={() => { router.replace(`?chapter=${ch.chapter_number}`); onClose(); }}
                            className={`flex items-center justify-between gap-3 text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-dark-raised ${ch.isLocked ? "opacity-70" : "opacity-100"} ${Number(currentChapter) === Number(ch.chapter_number) ? "font-bold text-red-600" : ""}`}>
                            <span className="truncate">
                                {ch.title?.trim()
                                    ? t("chapterTitled", { chapter: ch.chapter_number, title: ch.title.trim() })
                                    : r("chapterN", { chapter: ch.chapter_number })}
                            </span>

                            {ch.isLocked && (
                                <FaLock className="shrink-0 text-gray-500 dark:text-neutral-400 text-sm" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Ranges of 100 chapters, only when there is more than one */}
                {rangeCount > 1 && (
                    <div className="mt-4 flex gap-6 overflow-x-auto pb-2 text-sm">
                        {Array.from({ length: rangeCount }, (_, i) => {
                            const first = list[i * RANGE_SIZE].chapter_number;
                            const last = list[Math.min((i + 1) * RANGE_SIZE, list.length) - 1].chapter_number;
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setRange(i)}
                                    className={`shrink-0 whitespace-nowrap border-b pb-1 transition ${i === range ? "border-red-600 text-red-600" : "border-transparent text-gray-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"}`}>
                                    {first}-{last}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}