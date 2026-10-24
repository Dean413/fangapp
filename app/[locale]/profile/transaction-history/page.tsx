"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/lib/store/toastStore";
import { useWalletStore } from "@/lib/store/wallet-action-store";
import { useLocale, useTranslations } from "next-intl";
import { coinDescription, coinType } from "@/lib/coinLabels";
import TransactionFilters, { EMPTY_RANGE, type DateRange, type TxFilter } from "@/components/profile-components/transactionFilter";

// The wallet page (Top Up opens its Top Up tab)
const WALLET_PATH = "/profile/wallet";

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
};

const DOT: Record<Transaction["category"], string> = {
    topup: "bg-pink-500",
    vip: "bg-yellow-500",
    bonus: "bg-orange-400",
    reward: "bg-green-500",
    spent: "bg-red-500",
    expired: "bg-gray-400",
};

const formatDate = (iso: string, locale: string) => new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
const formatTime = (iso: string, locale: string) => new Date(iso).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
const formatMoney = (cents: number, locale: string) => new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(cents / 100);
const formatAmount = (n: number) => `${n > 0 ? "+" : "−"}${Math.abs(n).toLocaleString()}`;

export default function TransactionHistory() {
    const router = useRouter()
    const setActive = useWalletStore((s) => s.setActive)
    const t = useTranslations("Transactions")
    const ct = useTranslations("Coins")
    const locale = useLocale()

    const [filter, setFilter] = useState<TxFilter>("all");
    const [range, setRange] = useState<DateRange>(EMPTY_RANGE);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const busy = useRef(false);

    // Changes with every filter, so an answer for older filters is never shown
    const latest = useRef("");
    const key = `${filter}|${range.from}|${range.to}`;
    latest.current = key;

    const load = useCallback(async (which: TxFilter, when: DateRange, before?: string) => {
        const qs = new URLSearchParams({ filter: which });
        if (when.from) qs.set("from", when.from);
        if (when.to) qs.set("to", when.to);
        if (before) qs.set("before", before);
        const res = await fetch(`/api/wallet/transactions?${qs.toString()}`, {
            credentials: "include",
            cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || t("loadFailed"));
        return data as { transactions: Transaction[]; hasMore: boolean };
    }, [t]);

    // First page (again when the type or the dates change)
    useEffect(() => {
        // A custom range waits until both days are picked
        if (range.preset === "custom" && (!range.from || !range.to)) return;
        let cancelled = false;
        setLoading(true);
        load(filter, range)
            .then((data) => {
                if (cancelled) return;
                setTransactions(data.transactions);
                setHasMore(data.hasMore);
            })
            .catch((err) => { if (!cancelled) toast.error(err.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter, range.from, range.to, range.preset, load]);

    const loadMore = async () => {
        if (busy.current || !hasMore || transactions.length === 0) return;
        busy.current = true;
        setLoadingMore(true);
        const asked = key;
        try {
            const data = await load(filter, range, transactions[transactions.length - 1].id);
            if (latest.current !== asked) return;
            setTransactions((prev) => [...prev, ...data.transactions]);
            setHasMore(data.hasMore);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t("loadMoreFailed"));
        } finally {
            busy.current = false;
            setLoadingMore(false);
        }
    };

    const goTopUp = () => {
        setActive("topup");
        router.push(WALLET_PATH);
    };

    return (
        <div className="bg-white dark:bg-dark-card rounded-3xl p-6 md:p-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {t("title")}
                    </h2>
                    <p className="text-gray-500 dark:text-neutral-400 mt-1">
                        {t("subtitle")}
                    </p>
                </div>

                <TransactionFilters type={filter} onType={setFilter} range={range} onRange={setRange} />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                {loading ? (
                    <div className="space-y-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-12 rounded-lg bg-gray-100 dark:bg-neutral-800 animate-pulse" />
                        ))}
                    </div>
                ) : transactions.length === 0 ? (
                    filter === "all" && range.preset === "all" ? (
                        <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
                            <Image
                                src="/fang_pictures/transaction-history.png"
                                alt={t("emptyTitle")}
                                width={200}
                                height={200}
                            />

                            <h2 className="text-2xl font-bold">{t("emptyTitle")}</h2>
                            <p className="w-80 text-center">{t("emptyText")}</p>
                            <button type="button" onClick={goTopUp} className="bg-red-700 text-white px-6 py-3 w-50 text-center rounded-xl">
                                {t("topUp")}
                            </button>
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 dark:text-neutral-400 py-20">{filter === "all" ? t("empty_filtered") : t(`empty_${filter}`)}</p>
                    )
                ) : (
                    <table className="w-full min-w-225">
                        <thead>
                            <tr className="border-b text-left text-gray-500 dark:text-neutral-400 text-sm">
                                <th className="pb-4 font-medium">{t("date")}</th>
                                <th className="pb-4 font-medium">{t("type")}</th>
                                <th className="pb-4 font-medium">{t("description")}</th>
                                <th className="pb-4 font-medium">{t("amount")}</th>
                                <th className="pb-4 font-medium">{t("balance")}</th>
                            </tr>
                        </thead>

                        <tbody>
                            {transactions.map((item) => (
                                <tr
                                    key={item.id}
                                    onClick={() => router.push(`/profile/transaction-history/${item.id}`)}
                                    className="border-b cursor-pointer border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-card transition">
                                    <td className="py-5">
                                        <div className="font-medium text-gray-900 dark:text-white">
                                            {formatDate(item.at, locale)}
                                        </div>
                                        <div className="text-sm text-gray-400 dark:text-neutral-500">
                                            {formatTime(item.at, locale)}
                                        </div>
                                    </td>

                                    <td className="py-5">
                                        <div className="flex items-center gap-3">
                                            <span
                                                className={`w-2.5 h-2.5 rounded-full ${DOT[item.category]}`}
                                            />
                                            <span>{item.category === "vip" ? t("typeVip") : coinType(ct, item.reason, item.amount)}</span>
                                        </div>
                                    </td>

                                    <td className="py-5 text-gray-700 dark:text-neutral-200">
                                        {item.category === "vip" ? (item.refId === "monthly" ? t("vipMonthly") : t("vipWeekly")) : item.reason === "expired" ? t("expiredEntry", { source: coinDescription(ct, item.reason, item.refId) }) : coinDescription(ct, item.reason, item.refId, item.description)}
                                        {item.expiresAt && (
                                            <div className="text-xs text-gray-400 dark:text-neutral-500">
                                                {t(new Date(item.expiresAt) > new Date() ? "expiresOn" : "expiredOn", { date: `${formatDate(item.expiresAt, locale)}, ${formatTime(item.expiresAt, locale)}` })}
                                            </div>
                                        )}
                                    </td>

                                    <td
                                        className={`py-5 font-semibold ${item.category === "vip" ? "text-gray-800 dark:text-neutral-100" : item.amount > 0 ? "text-green-500" : item.category === "expired" ? "text-gray-400 dark:text-neutral-500" : "text-red-500"}`}
                                    >
                                        {item.category === "vip" && item.amountCents != null ? formatMoney(item.amountCents, locale) : `${formatAmount(item.amount)} ${item.coinKind === "coins" ? t("unitCoins") : t("unitBonusCoins")}`}
                                    </td>

                                    <td className="py-5 text-gray-800 dark:text-neutral-100">
                                        {item.category === "vip" ? "—" : item.balance.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

            </div>

            {/* Load More */}
            {!loading && hasMore && (
                <div className="flex justify-center mt-8">
                    <button type="button" onClick={loadMore} disabled={loadingMore} className={`border rounded-xl px-6 py-3 text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-dark-card disabled:opacity-60`}>
                        {loadingMore ? t("loading") : t("loadMore")}
                    </button>
                </div>
            )}
        </div>
    );
}