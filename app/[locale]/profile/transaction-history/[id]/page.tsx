"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Copy, MessageCircle } from "lucide-react";
import { toast } from "@/lib/store/toastStore";
import { useLocale, useTranslations } from "next-intl";
import { coinDescription, coinType } from "@/lib/coinLabels";

const SUPPORT_EMAIL = "support@fangapp.com";

type Transaction = {
    id: string;
    at: string;
    type: string;
    category: "topup" | "vip" | "bonus" | "reward" | "spent" | "expired";
    description: string;
    amount: number;
    amountCents: number | null;
    coinKind: "coins" | "bonus coins";
    balance: number;
    expiresAt: string | null;
    reason: string;
    refId: string | null;
    provider: "stripe" | "paypal" | null;
    providerTxn: string | null;
};

const BADGE: Record<Transaction["category"], string> = {
    topup: "bg-pink-100 dark:bg-pink-500/15 text-pink-500",
    vip: "bg-yellow-100 dark:bg-yellow-500/15 text-yellow-600",
    bonus: "bg-orange-100 dark:bg-orange-500/15 text-orange-500",
    reward: "bg-green-100 dark:bg-green-500/15 text-green-600",
    spent: "bg-red-100 dark:bg-red-500/15 text-red-500",
    expired: "bg-gray-100 dark:bg-neutral-800 text-gray-500",
};

const formatDate = (iso: string, locale: string) => new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
const formatTime = (iso: string, locale: string) => new Date(iso).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
const formatMoney = (cents: number, locale: string) => new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(cents / 100);
// Our own codes show with a #; a payment provider's id shows as it is
const displayId = (id: string) => (id.startsWith("TXN") ? `#${id}` : id);

export default function TransactionDetails() {
    const router = useRouter();
    const params = useParams();
    const id = Array.isArray(params.id) ? params.id[0] : String(params.id ?? "");
    const t = useTranslations("Transactions");
    const ct = useTranslations("Coins");
    const locale = useLocale();

    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetch(`/api/wallet/transactions/${encodeURIComponent(id)}`, { credentials: "include", cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => { if (!cancelled) setTransaction(data?.transaction ?? null); })
            .catch(() => { if (!cancelled) setTransaction(null); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [id]);

    const copyId = async () => {
        try {
            await navigator.clipboard.writeText(displayId(id));
            toast.success(t("idCopied"));
        } catch {
            toast.error(t("copyFailed"));
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-dark p-6">
                <div className="max-w-5xl space-y-4 animate-pulse">
                    <div className="h-4 w-48 rounded bg-gray-200 dark:bg-neutral-800" />
                    <div className="h-8 w-64 rounded bg-gray-200 dark:bg-neutral-800" />
                    <div className="h-80 rounded-2xl bg-gray-200 dark:bg-neutral-800 lg:w-1/2" />
                </div>
            </div>
        );
    }

    if (!transaction) {
        return (
            <div className="p-6">
                <p>{t("notFound")}</p>
                <button type="button" onClick={() => router.back()}>
                    {t("goBack")}
                </button>
            </div>
        );
    }

    const previousBalance = transaction.balance - transaction.amount;
    const added = transaction.amount > 0;
    const unit = transaction.coinKind === "coins" ? t("unitCoinsTitle") : t("unitBonusCoinsTitle");
    const isVip = transaction.category === "vip";
    const description = isVip
        ? (transaction.refId === "monthly" ? t("vipMonthly") : t("vipWeekly"))
        : transaction.reason === "expired"
            ? t("expiredEntry", { source: coinDescription(ct, transaction.reason, transaction.refId) })
            : coinDescription(ct, transaction.reason, transaction.refId, transaction.description);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark p-6">
            {/* Back Button */}
            <button type="button" onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 dark:text-neutral-300 hover:text-gray-800 dark:hover:text-neutral-100 mb-6 text-sm">
                <ArrowLeft size={16} />
                {t("backToHistory")}
            </button>

            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("detailsTitle")}</h1>
                <p className="text-gray-500 dark:text-neutral-400 text-sm mt-1">{t("detailsSubtitle")}</p>
            </div>

            <div className="max-w-5xl space-y-5 lg:w-1/2">

                {/* Card */}
                <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-dark-border p-6 space-y-5">
                    {/* Type Badge & Date */}
                    <div className="flex items-start justify-between">
                        <span className={`${BADGE[transaction.category]} text-xs font-semibold px-3 py-1 rounded-full`}>
                            {isVip ? t("typeVip") : coinType(ct, transaction.reason, transaction.amount)}
                        </span>
                        <div className="text-right text-xs text-gray-400 dark:text-neutral-500">
                            <p>{formatDate(transaction.at, locale)}</p>
                            <p>{formatTime(transaction.at, locale)}</p>
                        </div>
                    </div>

                    {/* Icon & Title */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-neutral-800 flex items-center justify-center text-lg">
                            {isVip ? "👑" : "🪙"}
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-900 dark:text-white text-base">{description}</h2>
                            {transaction.category === "expired" ? (
                                <p className="text-gray-400 text-sm font-medium">{t("expiredUnused")}</p>
                            ) : (
                                <p className="text-green-500 text-sm font-medium">{t("completed")}</p>
                            )}
                        </div>
                    </div>

                    {/* Transaction ID */}
                    <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-neutral-500">
                        <span>{t("transactionId", { id: displayId(transaction.id) })}</span>
                        <button type="button" onClick={copyId} className="hover:text-gray-600 dark:hover:text-neutral-300">
                            <Copy size={12} />
                        </button>
                    </div>

                    <hr className="border-gray-100 dark:border-dark-border" />

                    {/* Details Rows */}
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-neutral-400">{t("type")}</span>
                            <span className="text-gray-800 dark:text-neutral-100 font-medium">{isVip ? t("typeVip") : unit}</span>
                        </div>
                        {isVip && transaction.amountCents != null ? (
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-neutral-400">{t("amountPaid")}</span>
                                <span className="text-gray-800 dark:text-neutral-100 font-medium">{formatMoney(transaction.amountCents, locale)}</span>
                            </div>
                        ) : (
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-neutral-400">{added ? t("coinsReceived") : transaction.category === "expired" ? t("coinsExpired") : t("coinsSpent")}</span>
                                <span className={`${added ? "text-green-500" : "text-red-500"} font-medium`}>
                                    {added ? "+" : "−"}{Math.abs(transaction.amount).toLocaleString()} {unit}
                                </span>
                            </div>
                        )}
                        {transaction.expiresAt && (
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-neutral-400">{new Date(transaction.expiresAt) > new Date() ? t("expires") : t("expired")}</span>
                                <span className="text-gray-800 dark:text-neutral-100 font-medium">
                                    {formatDate(transaction.expiresAt, locale)}, {formatTime(transaction.expiresAt, locale)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Balance (VIP charges move no coins) */}
                    {!isVip && (
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-neutral-400">{t("previousBalance")}</span>
                                <span className="text-gray-800 dark:text-neutral-100 font-medium">{t("coinsAmount", { amount: previousBalance.toLocaleString() })}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-neutral-400">{t("newBalance")}</span>
                                <span className="text-gray-800 dark:text-neutral-100 font-medium">{t("coinsAmount", { amount: transaction.balance.toLocaleString() })}</span>
                            </div>
                        </div>
                    )}

                    <hr className="border-gray-100 dark:border-dark-border" />

                    {/* Help Section */}
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="font-semibold text-gray-800 dark:text-neutral-100 text-sm">{t("helpTitle")}</p>
                            <p className="text-gray-400 dark:text-neutral-500 text-xs mt-1">
                                {t("helpText")}
                            </p>
                        </div>
                        <a
                            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t("helpSubject", { id: displayId(transaction.id) }))}`}
                            className="flex items-center gap-2 border border-red-400 text-red-400 rounded-full px-4 py-2 text-xs font-medium whitespace-nowrap hover:bg-red-50 dark:hover:bg-red-500/10 transition">
                            <MessageCircle size={14} />
                            {t("contactSupport")}
                        </a>
                    </div>
                </div>

                {/* Info Banner */}
                <div className="bg-linear-to-r from-blue-500 to-purple-500 rounded-2xl p-4">
                    <p className="text-white text-xs">
                        {isVip
                            ? t("vipInfo")
                            : transaction.coinKind === "bonus coins"
                                ? t("bonusInfo")
                                : t("coinsInfo")}
                    </p>
                </div>
            </div>
        </div>
    );
}