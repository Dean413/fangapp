"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { READER_FONTS } from "./reader-fonts";
import { useTranslations } from "next-intl";

const THEME_OPTIONS = [
    { id: "light", bg: "bg-white text-black border border-gray-200" },
    { id: "sepia", bg: "bg-[#f4ecd8] text-black border border-[#eadfc6]" },
    { id: "dark", bg: "bg-gray-800 text-white border border-gray-800" },
    { id: "black", bg: "bg-black text-white border border-black dark:border-neutral-700" },
];

const label = "text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-neutral-400 mb-3";
const box = "rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark";

export default function SettingsSheet({ settings, setSettings, onClose }: any) {
    const [fontsOpen, setFontsOpen] = useState(false);
    const t = useTranslations("Reader");
    const current = READER_FONTS.find((f) => f.id === (settings.fontFamily ?? "default")) ?? READER_FONTS[0];

    return (
        <div className="fixed inset-0 z-50 flex">
            {/* CLICK OUTSIDE */}
            <div className="flex-1" onClick={onClose} />
            {/* RIGHT PANEL */}
            <div className="md:flex fixed md:right-15 right-5 top-1/2 w-80 md:w-100 -translate-y-1/2 flex-col gap-4 max-h-[85vh] overflow-y-auto no-scrollbar bg-gray-50 dark:bg-dark-card text-gray-900 dark:text-white border border-transparent dark:border-dark-border rounded-xl shadow-xl px-3 py-4 z-50">
                <h2 className="text-center text-black dark:text-white font-bold text-lg mb-4">
                    DISPLAY OPTIONS
                </h2>

                {/* THEME */}
                <div className="mb-6">
                    <p className={label}>{t("theme")}</p>
                    <div className="grid grid-cols-4 gap-3">
                        {THEME_OPTIONS.map((theme) => {
                            const on = settings.theme === theme.id;
                            return (
                                <button key={theme.id} type="button" onClick={() => setSettings({ ...settings, theme: theme.id })}
                                    className={`h-20 rounded-xl flex items-center justify-center text-xl font-bold relative ${theme.bg} ${on ? "border-red-500!" : ""}`}>
                                    Aa
                                    {on && (
                                        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                                            <Check size={10} strokeWidth={3} className="text-white" />
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* FONTS (dropdown) */}
                <div className="mb-6">
                    <p className={label}>{t("fonts")}</p>
                    <div className={`${box} overflow-hidden`}>
                        <button type="button" onClick={() => setFontsOpen((o) => !o)} aria-expanded={fontsOpen}
                            className="w-full h-16 px-4 flex items-center justify-between">
                            <span className={`${current.className} text-xl font-semibold text-gray-600 dark:text-neutral-200`}>{current.id === "default" ? t("defaultFont") : current.label}</span>
                            <ChevronDown size={26} className={`text-gray-500 dark:text-neutral-400 transition-transform ${fontsOpen ? "rotate-180" : ""}`} />
                        </button>

                        {fontsOpen && (
                            <div className="border-t border-gray-200 dark:border-dark-border max-h-64 overflow-y-auto">
                                {READER_FONTS.map((f) => {
                                    const on = f.id === current.id;
                                    return (
                                        <button key={f.id} type="button"
                                            onClick={() => { setSettings({ ...settings, fontFamily: f.id }); setFontsOpen(false); }}
                                            className={`w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-dark-raised ${on ? "text-red-600" : "text-gray-800 dark:text-neutral-200"}`}>
                                            <span className={`${f.className} text-base`}>{f.id === "default" ? t("defaultFont") : f.label}</span>
                                            {on && <Check size={18} />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* TEXT SIZE */}
                <div>
                    <p className={label}>{t("textSize")}</p>

                    <div className="grid grid-cols-3 gap-3">
                        <button type="button"
                            onClick={() => setSettings({ ...settings, fontSize: Math.max(14, settings.fontSize - 2) })}
                            disabled={settings.fontSize <= 14}
                            className={`${box} h-16 flex items-center justify-center text-xl text-gray-600 dark:text-neutral-200 disabled:opacity-40`}>
                            A-
                        </button>

                        <div className={`${box} h-16 flex flex-col items-center justify-center`}>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">
                                {settings.fontSize}
                            </p>
                            <p className="mt-1 text-[10px] text-gray-400 dark:text-neutral-500">
                                {t("currentSize")}
                            </p>
                        </div>

                        <button type="button"
                            onClick={() => setSettings({ ...settings, fontSize: Math.min(30, settings.fontSize + 2) })}
                            disabled={settings.fontSize >= 30}
                            className={`${box} h-16 flex items-center justify-center text-xl text-gray-600 dark:text-neutral-200 disabled:opacity-40`}>
                            A+
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}