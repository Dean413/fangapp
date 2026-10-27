"use client";
import type { Dispatch, SetStateAction } from "react";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { POLL_DAYS } from "@/lib/communityPage/types";

// The option fields and length picker shown in the post box when Poll is on
export default function PollBuilder({ options, setOptions, days, setDays }: {
    options: string[];
    setOptions: Dispatch<SetStateAction<string[]>>;
    days: number;
    setDays: (d: number) => void;
}) {
    const t = useTranslations("Community");
    return (
        <div className="mb-3 rounded-xl border border-gray-200 dark:border-dark-border p-3 flex flex-col gap-2">
            {options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                    <input value={o} maxLength={60}
                        onChange={(e) => setOptions((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                        placeholder={t("pollOption", { n: i + 1 })}
                        className="flex-1 bg-gray-100 dark:bg-dark-raised rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-neutral-200 placeholder-gray-400 dark:placeholder-neutral-500 outline-none focus:ring-2 focus:ring-rose-300" />
                    {options.length > 2 && (
                        <button onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))} aria-label={t("removeOption")}
                            className="text-gray-400 hover:text-red-500 p-1">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ))}
            {options.length < 4 && (
                <button onClick={() => setOptions((prev) => [...prev, ""])}
                    className="self-start flex items-center gap-1 text-xs font-semibold text-rose-500">
                    <Plus className="w-3.5 h-3.5" /> {t("addOption")}
                </button>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-gray-500 dark:text-neutral-400">{t("pollLength")}</span>
                {POLL_DAYS.map((d) => (
                    <button key={d} onClick={() => setDays(d)}
                        className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${days === d ? "bg-red-700 text-white border-red-700" : "border-gray-300 dark:border-dark-border text-gray-600 dark:text-neutral-300"}`}>
                        {t("pollDays", { count: d })}
                    </button>
                ))}
            </div>
        </div>
    );
}