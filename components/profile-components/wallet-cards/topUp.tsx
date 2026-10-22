"use client";

// components/profile-components/wallet-cards/topup-modal.tsx
// Payment popup for a coin package or a VIP plan: pick Stripe or PayPal, agree to the terms, continue.
// It only DISPLAYS what the reader gets. The server decides the real price and what is credited
// (POST /api/checkout).
import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/store/toastStore";
import { VIP_PLAN_INFO, formatUsd, type VipPlanId } from "@/lib/vipRates";

// Change these to your logo file, your Terms and Privacy pages, and the company details
const LOGO_SRC = "/fang_pictures/fang_logo2.png";
const TERMS_HREF = "/terms";
const PRIVACY_HREF = "/privacy";
const COMPANY_LINES = ["IFO DIGITAL MEDIA, LLC", "1111B S Governors Ave STE 52111, Dover, DE 19904, United States."];

export type TopUpPackage = { coins: number; bonus: number; price: number };
type Provider = "stripe" | "paypal";

type Props = {
    pkg?: TopUpPackage | null;  // a coin package picked in the table
    plan?: VipPlanId | null;    // or a VIP plan picked on the VIP cards
    vipPercent?: number;        // coin packages only: 0 when the reader is not VIP
    onClose: () => void;
};

function Coins({ size = 26 }: { size?: number }) {
    return <Image src="/fang_pictures/coin-topup.png" alt="" width={size} height={size} />;
}

export default function TopUpModal({ pkg = null, plan = null, vipPercent = 0, onClose }: Props) {
    const t = useTranslations("Wallet");
    const v = useTranslations("Vip");
    const [provider, setProvider] = useState<Provider>("stripe");
    const [agreed, setAgreed] = useState(false);
    const [busy, setBusy] = useState(false);

    const open = !!(pkg || plan);

    // Fresh form every time it opens
    useEffect(() => {
        if (open) {
            setProvider("stripe");
            setAgreed(false);
            setBusy(false);
        }
    }, [pkg, plan, open]);

    // Esc closes, page behind doesn't scroll
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !busy) onClose();
        };
        window.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [open, busy, onClose]);

    if (!open) return null;

    const info = plan ? VIP_PLAN_INFO[plan] : null;
    const vipBonus = pkg ? Math.floor((pkg.coins * vipPercent) / 100) : 0;
    const total = pkg ? pkg.coins + pkg.bonus + vipBonus : 0;
    const priceLabel = info ? formatUsd(info.priceCents) : `$${(pkg as TopUpPackage).price.toFixed(2)}`;

    async function proceed() {
        if (!agreed || busy) return;
        setBusy(true);
        try {
            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(plan ? { plan, provider } : { coins: pkg!.coins, provider }),
            });
            const data = await res.json().catch(() => null);
            if (res.ok && data?.url) {
                window.location.href = data.url; // stays "busy" while the browser leaves
                return;
            }
            toast.error(data?.message || t("payFailed"));
        } catch {
            toast.error(t("payFailed"));
        }
        setBusy(false);
    }

    const row = "flex items-center justify-between py-2.5 text-sm";
    const link = "font-medium text-red-600 underline-offset-2 hover:underline";

    return (
        <div
            className="fixed inset-0 z-90 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && !busy) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={t("payTitle")}
                className="flex max-h-[95vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl dark:bg-dark-card sm:max-w-md sm:rounded-2xl"
            >
                {/* Header (stays put) */}
                <div className="shrink-0 px-5 pt-5 sm:px-6 sm:pt-6">
                    <div className="flex items-center justify-between">
                        <Image src={LOGO_SRC} alt="FANG" width={90} height={30} className="h-7 w-auto" />
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={busy}
                            aria-label={t("payClose")}
                            className="rounded-full p-1.5 text-gray-500 transition hover:bg-gray-100 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
                        </button>
                    </div>

                    <h2 className="mt-6 border-b border-gray-200 pb-3 text-lg font-bold dark:border-dark-border">{t("payTitle")}</h2>
                </div>

                {/* Middle (scrolls on small screens) */}
                <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 sm:px-6">
                    {/* Payment method */}
                    <div className="mt-5 grid grid-cols-2 gap-3" role="radiogroup" aria-label={t("payTitle")}>
                        {(["stripe", "paypal"] as Provider[]).map((p) => {
                            const selected = provider === p;
                            return (
                                <button
                                    key={p}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    onClick={() => setProvider(p)}
                                    disabled={busy}
                                    className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${selected ? "border-red-500 bg-red-50/40 dark:bg-red-950/20" : "border-gray-200 bg-gray-50 dark:border-dark-border dark:bg-neutral-900"}`}
                                >
                                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-red-500" : "border-gray-300 dark:border-neutral-600"}`}>
                                        {selected && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
                                    </span>
                                    <Image
                                        src={p === "stripe" ? "/fang_pictures/stripe.png" : "/fang_pictures/paypal_logo.png"}
                                        alt=""
                                        width={40}
                                        height={40}
                                        className="h-10 w-10 shrink-0 rounded-lg object-contain"
                                    />
                                    <span className="text-sm font-medium">{p === "stripe" ? t("payStripe") : t("payPaypal")}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* What they get */}
                    <div className="mt-6">
                        {info && plan ? (
                            <>
                                <div className="flex items-center justify-between pb-2">
                                    <span className="text-lg font-bold">{plan === "weekly" ? v("weekly") : v("monthly")}</span>
                                    <span className="text-2xl" aria-hidden>👑</span>
                                </div>
                                <div>
                                    <div className={row}>
                                        <span>{t("payDuration")}</span>
                                        <span>{t("payDays", { count: info.days })}</span>
                                    </div>
                                    <div className={row}>
                                        <span>{t("payDailyCoins")}</span>
                                        <span className="flex items-center gap-2">{info.dailyBonusCoins} <Coins size={22} /></span>
                                    </div>
                                    <div className={row}>
                                        <span>{t("payFreeUnlocks")}</span>
                                        <span>{info.freeUnlocksPerDay}</span>
                                    </div>
                                    <div className={row}>
                                        <span>{t("payTopupBonus")}</span>
                                        <span>+{info.topUpPercent}%</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center justify-between pb-2">
                                    <span className="text-lg font-bold">{t("payTotal")}</span>
                                    <span className="flex items-center gap-2 text-lg font-bold">
                                        {total.toLocaleString()} <Coins />
                                    </span>
                                </div>

                                <div>
                                    <div className={row}>
                                        <span>{t("payCoin")}</span>
                                        <span className="flex items-center gap-2">{pkg!.coins.toLocaleString()} <Coins size={22} /></span>
                                    </div>
                                    <div className={row}>
                                        <span>{t("payBonus")}</span>
                                        <span className="flex items-center gap-2">{pkg!.bonus.toLocaleString()} <Coins size={22} /></span>
                                    </div>
                                    {vipPercent > 0 && (
                                        <div className={row}>
                                            <span>{t("payVipBonus")}</span>
                                            <span className="flex items-center gap-2">{vipBonus.toLocaleString()} <Coins size={22} /></span>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        <div className="mt-1 flex items-center justify-between border-t border-gray-300 pt-3 dark:border-neutral-600">
                            <span className="text-sm font-bold">{t("payUsd")}</span>
                            <span className="text-xl font-bold">{priceLabel}</span>
                        </div>
                    </div>

                    {/* Consent */}
                    <label className="mt-6 flex cursor-pointer items-center gap-3 text-sm leading-snug text-gray-900 dark:text-neutral-200">
                        <input
                            type="checkbox"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                            disabled={busy}
                            className="h-5 w-5 shrink-0 cursor-pointer accent-red-600"
                        />
                        <span>
                            {t.rich(plan ? "payConsentVip" : "payConsent", {
                                terms: (chunks) => (
                                    <a href={TERMS_HREF} target="_blank" rel="noopener noreferrer" className={link} onClick={(e) => e.stopPropagation()}>{chunks}</a>
                                ),
                                privacy: (chunks) => (
                                    <a href={PRIVACY_HREF} target="_blank" rel="noopener noreferrer" className={link} onClick={(e) => e.stopPropagation()}>{chunks}</a>
                                ),
                            })}
                        </span>
                    </label>
                </div>

                {/* Footer (stays put) */}
                <div className="shrink-0 px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
                    <button
                        type="button"
                        onClick={proceed}
                        disabled={!agreed || busy}
                        className="w-full rounded-xl bg-red-600 py-3.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {busy ? t("payRedirecting") : t("payProceed")}
                    </button>

                    <div className="mt-5 text-center text-xs leading-snug text-gray-700 dark:text-neutral-300">
                        {COMPANY_LINES.map((line, i) => (
                            <p key={line} className={i === 0 ? "font-medium" : ""}>{line}</p>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}