"use client";

// components/profile-components/wallet-cards/topup-modal.tsx
// Payment popup for a coin package: pick Stripe or PayPal, agree to the terms, continue.
// It only DISPLAYS what the reader gets. The server decides the real price and coins
// from the package and the reader's VIP plan (POST /api/checkout).
import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/store/toastStore";
import { FaPaypal } from "react-icons/fa6";

// Change this to your logo file
const LOGO_SRC = "/fang_pictures/logo.png";

export type TopUpPackage = { coins: number; bonus: number; price: number };
type Provider = "stripe" | "paypal";

type Props = {
    pkg: TopUpPackage | null;   // the package picked in the table, null = closed
    vipPercent: number;         // 0 when the reader is not VIP
    onClose: () => void;
};

function Coins({ size = 26 }: { size?: number }) {
    return <Image src="/fang_pictures/coin-topup.png" alt="" width={size} height={size} />;
}

function StripeIcon() {
    return (
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#635BFF] text-white" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M4 7.5 14.5 5v3.2L4 10.7zM4 12.8l10.5-2.5v3.2L4 16zM4 18l10.5-2.5v3L4 21z" /></svg>
        </span>
    );
}

function PaypalIcon() {
    return (
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-lg font-extrabold italic text-[#003087] ring-1 ring-gray-200" aria-hidden>
            P
        </span>
    );
}

export default function TopUpModal({ pkg, vipPercent, onClose }: Props) {
    const t = useTranslations("Wallet");
    const [provider, setProvider] = useState<Provider>("stripe");
    const [agreed, setAgreed] = useState(false);
    const [busy, setBusy] = useState(false);

    // Fresh form every time it opens
    useEffect(() => {
        if (pkg) {
            setProvider("stripe");
            setAgreed(false);
            setBusy(false);
        }
    }, [pkg]);

    // Esc closes, page behind doesn't scroll
    useEffect(() => {
        if (!pkg) return;
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
    }, [pkg, busy, onClose]);

    if (!pkg) return null;

    const vipBonus = Math.floor((pkg.coins * vipPercent) / 100);
    const total = pkg.coins + pkg.bonus + vipBonus;

    async function proceed() {
        if (!pkg || !agreed || busy) return;
        setBusy(true);
        try {
            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ coins: pkg.coins, provider }),
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
                className="max-h-[95vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-dark-card sm:max-w-md sm:rounded-2xl sm:p-6"
            >
                {/* Header */}
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

                <h2 className="mt-6 border-b border-gray-200 pb-3 text-sm font-semibold dark:border-dark-border">{t("payTitle")}</h2>

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
                                {p === "stripe" ? <StripeIcon /> : <FaPaypal size={50} color="blue" />}
                                <span className="text-sm font-medium">{p === "stripe" ? t("payStripe") : t("payPaypal")}</span>
                            </button>
                        );
                    })}
                </div>

                {/* What they get */}
                <div className="mt-6">
                    <div className="flex items-center justify-between pb-2">
                        <span className="text-lg font-bold">{t("payTotal")}</span>
                        <span className="flex items-center gap-2 text-lg font-bold">
                            {total.toLocaleString()} <Coins />
                        </span>
                    </div>

                    <div className="divide-y divide-transparent">
                        <div className={row}>
                            <span>{t("payCoin")}</span>
                            <span className="flex items-center gap-2">{pkg.coins.toLocaleString()} <Coins size={22} /></span>
                        </div>
                        <div className={row}>
                            <span>{t("payBonus")}</span>
                            <span className="flex items-center gap-2">{pkg.bonus.toLocaleString()} <Coins size={22} /></span>
                        </div>
                        {vipPercent > 0 && (
                            <div className={row}>
                                <span>{t("payVipBonus")}</span>
                                <span className="flex items-center gap-2">{vipBonus.toLocaleString()} <Coins size={22} /></span>
                            </div>
                        )}
                    </div>

                    <div className="mt-1 flex items-center justify-between border-t border-gray-300 pt-3 dark:border-neutral-600">
                        <span className="text-sm font-bold">{t("payUsd")}</span>
                        <span className="text-lg font-bold">${pkg.price.toFixed(2)}</span>
                    </div>
                </div>

                {/* Consent */}
                <label className="mt-6 flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-gray-600 dark:text-neutral-300">
                    <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        disabled={busy}
                        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-red-600"
                    />
                    <span>{t("payConsent")}</span>
                </label>

                <button
                    type="button"
                    onClick={proceed}
                    disabled={!agreed || busy}
                    className="mt-6 w-full rounded-lg bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {busy ? t("payRedirecting") : t("payProceed")}
                </button>
            </div>
        </div>
    );
}