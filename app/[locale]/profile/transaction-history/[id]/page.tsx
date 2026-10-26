"use client";

import { useParams, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { ArrowLeft, Copy, MessageCircle, Sparkles } from "lucide-react";
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
    breakdown?: { coins: number; bonus: number; vipBonus: number; total: number } | null;
};

// Payment providers are brand names, the same in every language
const PROVIDER_NAMES = { stripe: "Stripe", paypal: "PayPal" } as const;

const formatDate = (iso: string, locale: string) => new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
const formatTime = (iso: string, locale: string) => new Date(iso).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
const formatMoney = (cents: number, locale: string) => new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(cents / 100);
// Our own codes show with a #; a payment provider's id shows as it is
const displayId = (id: string) => (id.startsWith("TXN") ? `#${id}` : id);

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-3 text-sm last:border-0 dark:border-dark-border">
            <span className="text-gray-500 dark:text-neutral-400">{label}</span>
            <span className="text-right font-medium text-gray-800 dark:text-neutral-100">{children}</span>
        </div>
    );
}

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
            <div className="min-h-screen bg-gray-50 p-6 dark:bg-dark">
                <div className="max-w-6xl animate-pulse space-y-4">
                    <div className="h-4 w-24 rounded bg-gray-200 dark:bg-neutral-800" />
                    <div className="h-8 w-64 rounded bg-gray-200 dark:bg-neutral-800" />
                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="h-72 rounded-2xl bg-gray-200 dark:bg-neutral-800" />
                        <div className="h-72 rounded-2xl bg-gray-200 dark:bg-neutral-800" />
                    </div>
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
    const isTopUp = transaction.category === "topup" && Boolean(transaction.breakdown);
    const isPayment = isVip || transaction.category === "topup";
    const expired = transaction.category === "expired";
    const title = isVip ? t("typeVip") : coinType(ct, transaction.reason, transaction.amount);
    const description = isVip
        ? (transaction.refId === "monthly" ? t("vipMonthly") : t("vipWeekly"))
        : transaction.reason === "expired"
            ? t("expiredEntry", { source: coinDescription(ct, transaction.reason, transaction.refId) })
            : coinDescription(ct, transaction.reason, transaction.refId, transaction.description);
    const coinsText = (amount: number) => t("coinsAmount", { amount: amount.toLocaleString() });

    return (
        <div className="min-h-screen bg-gray-50 p-6 dark:bg-dark">
            {/* Back Button */}
            <button type="button" onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 dark:text-neutral-300 dark:hover:text-neutral-100">
                <ArrowLeft size={16} />
                {t("back")}
            </button>

            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("detailsTitle")}</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">{t("detailsSubtitle")}</p>
            </div>

            <div className="grid max-w-6xl gap-6 lg:grid-cols-2 lg:items-start">
                {/* LEFT: what the transaction was, and help */}
                <div className="space-y-6">
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-dark-border dark:bg-dark-card md:p-6">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl dark:bg-red-500/15">
                                {isVip ? "👑" : "🪙"}
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
                        </div>

                        {isTopUp && transaction.breakdown ? (
                            <>
                                <Row label={t("coinsLabel")}>{coinsText(transaction.breakdown.coins)}</Row>
                                {transaction.breakdown.bonus > 0 && (
                                    <Row label={t("bonusLabel")}><span className="text-green-600">+{coinsText(transaction.breakdown.bonus)}</span></Row>
                                )}
                                {transaction.breakdown.vipBonus > 0 && (
                                    <Row label={t("vipBonusLabel")}><span className="text-green-600">+{coinsText(transaction.breakdown.vipBonus)}</span></Row>
                                )}
                                <div className="mt-3 flex items-center justify-between gap-4 rounded-lg bg-red-50 px-4 py-3 dark:bg-red-500/10">
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{t("totalCoinsReceived")}</span>
                                    <span className="font-bold text-red-600 dark:text-red-400">{coinsText(transaction.breakdown.total)}</span>
                                </div>
                            </>
                        ) : isVip ? (
                            <>
                                <Row label={t("type")}>{description}</Row>
                                {transaction.amountCents != null && (
                                    <Row label={t("amountPaid")}>{formatMoney(transaction.amountCents, locale)}</Row>
                                )}
                            </>
                        ) : (
                            <>
                                <Row label={t("description")}>{description}</Row>
                                <Row label={added ? t("coinsReceived") : expired ? t("coinsExpired") : t("coinsSpent")}>
                                    <span className={added ? "text-green-600" : expired ? "text-gray-500" : "text-red-500"}>
                                        {added ? "+" : "−"}{Math.abs(transaction.amount).toLocaleString()} {unit}
                                    </span>
                                </Row>
                                {transaction.expiresAt && (
                                    <Row label={new Date(transaction.expiresAt) > new Date() ? t("expires") : t("expired")}>
                                        {formatDate(transaction.expiresAt, locale)}, {formatTime(transaction.expiresAt, locale)}
                                    </Row>
                                )}
                                <Row label={t("previousBalance")}>{coinsText(previousBalance)}</Row>
                                <Row label={t("newBalance")}>{coinsText(transaction.balance)}</Row>
                            </>
                        )}
                    </div>

                    {/* Help Section */}
                    <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-dark-border dark:bg-dark-card md:p-6">
                        <div>
                            <p className="text-sm font-semibold text-gray-800 dark:text-neutral-100">{t("helpTitle")}</p>
                            <p className="mt-1 text-xs text-gray-400 dark:text-neutral-500">{t("helpText")}</p>
                        </div>
                        <a
                            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t("helpSubject", { id: displayId(transaction.id) }))}`}
                            className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-red-400 px-4 py-2 text-xs font-medium text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10">
                            <MessageCircle size={14} />
                            {t("contactSupport")}
                        </a>
                    </div>
                </div>

                {/* RIGHT: the payment (or the transaction), and a note */}
                <div className="space-y-5">
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-dark-border dark:bg-dark-card md:p-6">
                        <h2 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">{isPayment ? t("paymentInfo") : t("transactionInfo")}</h2>

                        <Row label={t("idLabel")}>
                            <span className="inline-flex items-center gap-2 break-all">
                                {displayId(transaction.id)}
                                <button type="button" onClick={copyId} aria-label={t("copyId")} className="text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300">
                                    <Copy size={13} />
                                </button>
                            </span>
                        </Row>
                        {isPayment && transaction.provider && (
                            <Row label={t("paymentMethod")}>{PROVIDER_NAMES[transaction.provider]}</Row>
                        )}
                        <Row label={isPayment ? t("paymentStatus") : t("status")}>
                            <span className={`rounded-md px-3 py-1 text-xs font-semibold ${expired ? "bg-gray-100 text-gray-500 dark:bg-neutral-800" : "bg-green-50 text-green-600 dark:bg-green-500/15"}`}>
                                {expired ? t("expiredUnused") : t("completed")}
                            </span>
                        </Row>
                        {isPayment && transaction.amountCents != null && (
                            <Row label={t("totalPaid")}>
                                <span className="font-bold text-red-600 dark:text-red-400">{formatMoney(transaction.amountCents, locale)} USD</span>
                            </Row>
                        )}
                        <Row label={t("dateTime")}>{formatDate(transaction.at, locale)}, {formatTime(transaction.at, locale)}</Row>
                    </div>

                    {/* Info Banner */}
                    <div className="flex items-start gap-2 rounded-2xl bg-red-50 p-4 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-300">
                        <Sparkles size={14} className="mt-0.5 shrink-0" />
                        <p>
                            {isVip
                                ? t("vipInfo")
                                : transaction.coinKind === "bonus coins"
                                    ? t("bonusInfo")
                                    : t("coinsInfo")}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}