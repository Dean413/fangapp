"use client";

import { Calendar, ChevronDown, Filter } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

export type TxFilter = "all" | "topup" | "vip" | "earned" | "spent" | "expired";
export type Preset = "all" | "today" | "7d" | "30d" | "year" | "custom";
export type DateRange = { preset: Preset; from: string; to: string };
export const EMPTY_RANGE: DateRange = { preset: "all", from: "", to: "" };

// Labels: Transactions.filter_<key> and Transactions.range_<key>
export const TYPES: TxFilter[] = ["all", "topup", "vip", "earned", "spent", "expired"];
const PRESETS: Preset[] = ["all", "today", "7d", "30d", "year", "custom"];

// The reader's own calendar day, as YYYY-MM-DD
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function presetRange(preset: Preset): DateRange {
    const now = new Date();
    const today = ymd(now);
    const back = (days: number) => ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - days));
    switch (preset) {
        case "today": return { preset, from: today, to: today };
        case "7d": return { preset, from: back(6), to: today };
        case "30d": return { preset, from: back(29), to: today };
        case "year": return { preset, from: `${now.getFullYear()}-01-01`, to: today };
        case "custom": return { preset, from: "", to: "" };
        default: return EMPTY_RANGE;
    }
}

const buttonClass = "flex items-center gap-2 border rounded-xl px-4 py-2 text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-dark-card";
const menuClass = "absolute right-0 mt-2 w-52 rounded-xl border bg-white dark:bg-dark-card dark:border-dark-border shadow-lg z-10 overflow-hidden";
const optionClass = (on: boolean) =>
    `block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-neutral-800 ${on ? "font-semibold text-red-600" : "text-gray-700 dark:text-neutral-200"}`;
const dateInput = "mt-1 w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent px-3 py-1.5 text-sm text-gray-700 dark:text-neutral-200";

// A dropdown that closes when you click elsewhere
function Dropdown({ button, children }: { button: (open: boolean, toggle: () => void) => React.ReactNode; children: (close: () => void) => React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const box = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => {
            if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [open]);

    return (
        <div className="relative" ref={box}>
            {button(open, () => setOpen((o) => !o))}
            {open && <div className={menuClass}>{children(() => setOpen(false))}</div>}
        </div>
    );
}

type Props = {
    type: TxFilter;
    onType: (t: TxFilter) => void;
    range: DateRange;
    onRange: (r: DateRange) => void;
};

// Two separate dropdowns side by side: one for the type, one for the dates
export default function TransactionFilters({ type, onType, range, onRange }: Props) {
    const t = useTranslations("Transactions");
    const locale = useLocale();
    const today = ymd(new Date());

    const day = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short" });
    const dateLabel =
        range.preset === "all" ? t("date")
            : range.preset === "custom" ? (range.from && range.to ? `${day(range.from)} – ${day(range.to)}` : t("range_custom"))
                : t(`range_${range.preset}`);

    return (
        <div className="flex flex-wrap items-center justify-end gap-2">
            {/* TYPE */}
            <Dropdown
                button={(open, toggle) => (
                    <button type="button" onClick={toggle} aria-expanded={open} className={buttonClass}>
                        <Filter size={16} />
                        {type === "all" ? t("type") : t(`filter_${type}`)}
                        <ChevronDown size={14} />
                    </button>
                )}>
                {(close) => TYPES.map((key) => (
                    <button key={key} type="button" onClick={() => { onType(key); close(); }} className={optionClass(type === key)}>
                        {t(`filter_${key}`)}
                    </button>
                ))}
            </Dropdown>

            {/* DATE */}
            <Dropdown
                button={(open, toggle) => (
                    <button type="button" onClick={toggle} aria-expanded={open} className={buttonClass}>
                        <Calendar size={16} />
                        {dateLabel}
                        <ChevronDown size={14} />
                    </button>
                )}>
                {(close) => (
                    <>
                        {PRESETS.map((key) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => { onRange(presetRange(key)); if (key !== "custom") close(); }}
                                className={optionClass(range.preset === key)}>
                                {t(`range_${key}`)}
                            </button>
                        ))}

                        {range.preset === "custom" && (
                            <div className="space-y-2 px-4 pb-3 pt-1">
                                <label className="block text-xs text-gray-500 dark:text-neutral-400">
                                    {t("rangeFrom")}
                                    <input type="date" value={range.from} max={range.to || today} onChange={(e) => onRange({ ...range, from: e.target.value })} className={dateInput} />
                                </label>
                                <label className="block text-xs text-gray-500 dark:text-neutral-400">
                                    {t("rangeTo")}
                                    <input type="date" value={range.to} min={range.from || undefined} max={today} onChange={(e) => onRange({ ...range, to: e.target.value })} className={dateInput} />
                                </label>
                            </div>
                        )}
                    </>
                )}
            </Dropdown>
        </div>
    );
}