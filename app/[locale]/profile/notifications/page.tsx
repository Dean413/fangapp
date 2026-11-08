"use client";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell, Trash2, UserPlus } from "lucide-react";
import NotificationTabs from "@/components/profile-components/notification/notification-tabs";
import NotificationCard from "@/components/profile-components/notification/notification-cards";
import NotificationSection from "@/components/profile-components/notification/notification-section";
import { FaBookOpen, FaClock, FaCrown, FaGift } from "react-icons/fa6";
import { FaUnlockAlt } from "react-icons/fa";
import { useTranslations } from "next-intl";
import { coinDescription } from "@/lib/coinLabels";
import { toast } from "@/lib/store/toastStore";

// Translators for the Notifications and Coins messages
type T = (key: string, values?: Record<string, string | number>) => string;

type Kind = "new_chapter" | "coins_added" | "coins_spent" | "coins_expired" | "bonus_expiring" | "checkin_ready" | "reply" | "vip_started" | "vip_renewed" | "vip_cancelled" | "vip_ended" | "admin_message";

type Notification = {
    id: string;
    kind: Kind;
    at: string;
    read: boolean;
    href: string | null;
    author?: string;
    storyTitle?: string;
    chapter?: number;
    amount?: number;
    reason?: string;
    refId?: string | null;
    description?: string;
    code?: string;
    expiresAt?: string;
    day?: number;
    coins?: number;
    claimable?: boolean;
    plan?: "weekly" | "monthly";
    endsAt?: string;
    amountCents?: number;
    notice?: string
};

const TAB_PARAM: Record<string, string> = { All: "all", Unread: "unread", Mentions: "mentions" };

const COIN = "/fang_pictures/balance.png";

// ---------- Times ----------

const startOfDay = (ms: number) => {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
};

type Group = "Today" | "Yesterday" | "Earlier";

function groupOf(iso: string, now: number): Group {
    const t = new Date(iso).getTime();
    const today = startOfDay(now);
    if (t >= today) return "Today";
    if (t >= today - 86400000) return "Yesterday";
    return "Earlier";
}

function timeText(iso: string, now: number, t: T): string {
    const ms = new Date(iso).getTime();
    const group = groupOf(iso, now);
    if (group === "Yesterday") return t("group_Yesterday");
    if (group === "Earlier") {
        const d = new Date(ms);
        const sameYear = d.getFullYear() === new Date(now).getFullYear();
        return d.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
    }
    const seconds = Math.max(0, Math.round((now - ms) / 1000));
    if (seconds < 60) return t("justNow");
    if (seconds < 3600) return t("minsAgo", { count: Math.floor(seconds / 60) });
    return t("hoursAgo", { count: Math.floor(seconds / 3600) });
}

// The whole sentence: "<b>N bonus coins</b> expire in 2 hours"
function expiringTitle(amount: number, iso: string | undefined, now: number, t: T): ReactNode {
    const b = (chunks: ReactNode) => <strong>{chunks}</strong>;
    const rich = t as unknown as { rich: (key: string, values: Record<string, unknown>) => ReactNode };
    if (!iso) return rich.rich("expireSoon", { count: amount, b });
    const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
    if (seconds <= 0) return rich.rich("expired", { count: amount, b });
    if (seconds < 3600) return rich.rich("expireInMins", { count: amount, mins: Math.max(1, Math.floor(seconds / 60)), b });
    return rich.rich("expireInHours", { count: amount, hours: Math.floor(seconds / 3600), b });
}

// ---------- Cards ----------

const Spent = ({ amount }: { amount: number }) => (
    <div className="flex gap-3">
        <p className="text-red-500 font-semibold"> -{Math.abs(amount)} </p>
        <Image src={COIN} alt="coins" width={20} height={10} />
    </div>
);

type CardParts = { icon: ReactNode; title: ReactNode; subtitle?: string; action?: ReactNode; wholeCardLink?: boolean };

function cardParts(n: Notification, now: number, t: T, ct: T): CardParts {
    const time = timeText(n.at, now, t);
    const amount = n.amount ?? 0;
    const rich = (t as unknown as { rich: (key: string, values: Record<string, unknown>) => ReactNode }).rich;
    const b = (chunks: ReactNode) => <strong>{chunks}</strong>;
    const description = coinDescription(ct, n.reason, n.refId, n.description);

    switch (n.kind) {
        case "new_chapter":
            return {
                icon: (
                    <div className="bg-red-500 p-3 rounded-xl text-white">
                        <FaBookOpen size={20} />
                    </div>
                ),
                title: rich("updated", { author: n.author ?? "", story: n.storyTitle ?? "", b }),
                subtitle: `${time} • ${t("chapterN", { chapter: n.chapter ?? 1 })}`,
                action: n.href ? (
                    <Link href={n.href} className="bg-red-500 text-white px-5 py-2 rounded-full">
                        {t("read")}
                    </Link>
                ) : undefined,
            };

        case "coins_added":
            if (n.reason === "purchase") {
                return {
                    icon: (
                        <div className="bg-green-100 dark:bg-green-500/15 p-3 rounded-xl">
                            <Image src={COIN} alt="coins" width={20} height={20} />
                        </div>
                    ),
                    title: <strong>{t("purchased", { count: amount })}</strong>,
                    subtitle: `#${n.code}`,
                    action: <span className="font-semibold text-green-600"> +{amount} 🪙</span>,
                    // wholeCardLink: true,
                };
            }


            return {
                icon: (
                    <div className="bg-yellow-100 dark:bg-yellow-500/15 p-3 rounded-xl">
                        <Image src={COIN} alt="coins" width={20} height={20} />
                    </div>
                ),
                title: rich("received", { count: amount, b }),
                subtitle: `${time} • ${description}`,
                // wholeCardLink: true,
            };

        case "coins_spent":
            if (n.reason === "vip") {
                return {
                    icon: (
                        <div className="bg-red-100 dark:bg-red-500/15 p-3 rounded-xl">
                            <FaCrown size={20} color="red" />
                        </div>
                    ),
                    title: t("vipSubscription"),
                    subtitle: time,
                    action: <Spent amount={amount} />,
                    // wholeCardLink: true,
                };
            }

            if (n.reason === "gift") {
                return {
                    icon: (
                        <div className="bg-pink-100 dark:bg-pink-500/15 p-3 rounded-xl">
                            <FaGift size={20} color="deeppink" />
                        </div>
                    ),
                    title: t("giftSent"),
                    subtitle: time,
                    action: <Spent amount={amount} />,
                };
            }
            return {
                icon: (
                    <div className="bg-indigo-100 dark:bg-indigo-500/15 p-3 rounded-xl">
                        <FaUnlockAlt size={20} color="purple" />
                    </div>
                ),
                title: n.reason === "unlock" ? t("chapterUnlocked") : description,
                subtitle: time,
                action: <Spent amount={amount} />,
                // wholeCardLink: true,
            };

        case "coins_expired":
            return {
                icon: (
                    <div className="bg-gray-100 dark:bg-dark-raised p-3 rounded-xl">
                        <Image src={COIN} alt="coins" width={20} height={20} />
                    </div>
                ),
                title: rich("bonusExpired", { count: Math.abs(amount), b }),
                subtitle: `${time} • ${description}`,
                action: <Spent amount={amount} />,
                // wholeCardLink: true,
            };

        case "bonus_expiring":
            return {
                icon: (
                    <div className="bg-yellow-100 dark:bg-yellow-500/15 p-3 rounded-xl text-yellow-600">
                        <FaClock size={20} />
                    </div>
                ),
                title: expiringTitle(amount, n.expiresAt, now, t),
                subtitle: `${time} • ${t("useBeforeExpire")}`,
                action: n.href ? (
                    <Link href={n.href} className="border border-red-500 text-red-500 px-4 py-2 rounded-full">
                        {t("view")}
                    </Link>
                ) : undefined,
            };

        case "checkin_ready":
            return {
                icon: (
                    <div className="bg-red-100 dark:bg-red-500/15 p-3 rounded-xl">
                        <FaGift size={20} color="red" />
                    </div>
                ),
                title: rich("checkinReady", { day: n.day ?? 1, b }),
                subtitle: `${time} • ${t("bonusCoins", { count: n.coins ?? 0 })}`,
                action: n.claimable && n.href ? (
                    <Link href={n.href} className="bg-red-500 text-white px-5 py-2 rounded-full">
                        {t("claim")}
                    </Link>
                ) : undefined,
            };

        case "vip_started":
        case "vip_renewed":
        case "vip_cancelled":
        case "vip_ended": {
            const planName = n.plan === "monthly" ? t("planMonthly") : t("planWeekly");
            const titleKey = n.kind === "vip_started" ? "vipStarted" : n.kind === "vip_renewed" ? "vipRenewed" : n.kind === "vip_cancelled" ? "vipCancelled" : "vipEnded";
            const until = n.endsAt
                ? new Date(n.endsAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                : "";
            const live = n.kind === "vip_started" || n.kind === "vip_renewed";
            return {
                icon: (
                    <div className={`${live ? "bg-yellow-100 dark:bg-yellow-500/15" : "bg-gray-100 dark:bg-dark-raised"} p-3 rounded-xl`}>
                        <FaCrown size={20} color={live ? "#c9a227" : "gray"} />
                    </div>
                ),
                title: rich(titleKey, { plan: planName, b }),
                subtitle: n.kind === "vip_ended" || !until ? time : `${time} • ${t("vipUntil", { date: until })}`,
                // wholeCardLink: Boolean(n.href),
            };
        }

        case "admin_message":
            return {
                icon: (
                    <div className="bg-gray-100 dark:bg-dark-raised p-3 rounded-xl">
                        <Bell />
                    </div>
                ),
                title: n.description || "",
                subtitle: `${time} • ${t(`notice_${n.notice ?? "announcement"}`)}`,
            };

        default:
            return {
                icon: (
                    <div className="bg-gray-100 dark:bg-dark-raised p-3 rounded-xl">
                        <UserPlus />
                    </div>
                ),
                title: n.description || t("newReply"),
                subtitle: time,
                wholeCardLink: Boolean(n.href),
            };
    }
}

function Skeleton() {
    return (
        <div className="space-y-4">
            {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-2xl border p-4 flex items-center gap-4 bg-white dark:bg-dark-card border-gray-100 dark:border-dark-border animate-pulse">
                    <div className="w-11 h-11 rounded-xl bg-gray-200 dark:bg-dark-raised" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-dark-raised" />
                        <div className="h-3 w-1/4 rounded bg-gray-200 dark:bg-dark-raised" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ---------- Page ----------

export default function NotificationsPage() {
    const t = useTranslations("Notifications");
    const ct = useTranslations("Coins");
    const c = useTranslations("Common");
    const [active, setActive] = useState("All");
    const [items, setItems] = useState<Notification[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(false);
    // server time minus this device's time, so "2 mins ago" is right whatever the device clock says
    const [offset, setOffset] = useState(0);
    const [now, setNow] = useState<number>(Date.now());

    // Choosing notifications to delete
    const [selecting, setSelecting] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [ask, setAsk] = useState<"selected" | "all" | null>(null);
    const [deleting, setDeleting] = useState(false);
    const deletingNow = useRef(false);

    const requestId = useRef(0);
    const moreBusy = useRef(false);
    const sentinel = useRef<HTMLDivElement | null>(null);
    // Unread notifications shown on this visit: marked as read when the reader leaves the page
    const seenUnread = useRef<Set<string>>(new Set());

    const remember = useCallback((list: Notification[]) => {
        for (const n of list) if (!n.read) seenUnread.current.add(n.id);
    }, []);

    const load = useCallback(async (tab: string) => {
        const id = ++requestId.current;
        setLoading(true);
        setError(false);
        try {
            const res = await fetch(`/api/notifications?tab=${TAB_PARAM[tab]}`, { credentials: "include", cache: "no-store" });
            const data = await res.json().catch(() => ({}));
            if (id !== requestId.current) return;
            if (!res.ok) {
                setError(true);
                setItems([]);
                setHasMore(false);
                return;
            }
            const list: Notification[] = data.notifications ?? [];
            if (data.serverNow) setOffset(new Date(data.serverNow).getTime() - Date.now());
            setItems(list);
            setHasMore(Boolean(data.hasMore));
            remember(list);
        } catch {
            if (id === requestId.current) {
                setError(true);
                setItems([]);
                setHasMore(false);
            }
        } finally {
            if (id === requestId.current) setLoading(false);
        }
    }, [remember]);

    const loadMore = useCallback(async () => {
        if (moreBusy.current || !hasMore || loading || items.length === 0) return;
        moreBusy.current = true;
        setLoadingMore(true);
        const id = requestId.current;
        try {
            const last = items[items.length - 1].id;
            const res = await fetch(`/api/notifications?tab=${TAB_PARAM[active]}&before=${last}`, { credentials: "include", cache: "no-store" });
            const data = await res.json().catch(() => ({}));
            if (id !== requestId.current || !res.ok) return;
            const list: Notification[] = data.notifications ?? [];
            setItems((prev) => {
                const known = new Set(prev.map((n) => n.id));
                return [...prev, ...list.filter((n) => !known.has(n.id))];
            });
            setHasMore(Boolean(data.hasMore));
            remember(list);
        } catch {
            // the sentinel tries again when scrolled to
        } finally {
            moreBusy.current = false;
            setLoadingMore(false);
        }
    }, [active, hasMore, items, loading, remember]);

    useEffect(() => {
        load(active);
    }, [active, load]);

    // Ticks only make sense for the tab that is on screen
    useEffect(() => { setSelected(new Set()); }, [active]);

    // Keep "2 mins ago" fresh
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Load the next page when the bottom of the list comes into view
    useEffect(() => {
        const el = sentinel.current;
        if (!el || !hasMore) return;
        const observer = new IntersectionObserver((entries) => {
            if (entries[0]?.isIntersecting) loadMore();
        }, { rootMargin: "200px" });
        observer.observe(el);
        return () => observer.disconnect();
    }, [hasMore, loadMore]);

    // Leaving the page (or closing the tab): what was shown counts as read
    useEffect(() => {
        const flush = () => {
            const ids = [...seenUnread.current];
            if (ids.length === 0) return;
            seenUnread.current.clear();
            for (let i = 0; i < ids.length; i += 200) {
                fetch("/api/notifications/read", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    keepalive: true,
                    body: JSON.stringify({ ids: ids.slice(i, i + 200) }),
                }).catch(() => { });
            }
        };
        window.addEventListener("pagehide", flush);
        return () => {
            window.removeEventListener("pagehide", flush);
            flush();
        };
    }, []);

    const serverNow = now + offset;
    // Chapter unlocks aren't shown here (they're in the transaction history)
    const visible = items.filter((n) => !(n.kind === "coins_spent" && n.reason === "unlock"));

    // ---------- Deleting (a soft delete: the notification is only marked as deleted) ----------

    const stopSelecting = () => {
        setSelecting(false);
        setSelected(new Set());
    };

    const toggle = (id: string) =>
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const allTicked = visible.length > 0 && visible.every((n) => selected.has(n.id));
    const toggleAll = () => setSelected(allTicked ? new Set() : new Set(visible.map((n) => n.id)));

    const confirmDelete = async () => {
        if (!ask || deletingNow.current) return;
        deletingNow.current = true;
        setDeleting(true);
        try {
            const body = ask === "all" ? { all: true, tab: TAB_PARAM[active] } : { ids: [...selected] };
            const res = await fetch("/api/notifications", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(body),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast.error(data.message || t("deleteFailed"));
                return;
            }
            toast.success(t("deleted"));
            setAsk(null);
            stopSelecting();
            load(active);
        } catch {
            toast.error(c("networkError"));
        } finally {
            deletingNow.current = false;
            setDeleting(false);
        }
    };

    const showTools = !loading && !error && visible.length > 0;
    const groups: { title: Group; list: Notification[] }[] = (["Today", "Yesterday", "Earlier"] as Group[])
        .map((title) => ({ title, list: visible.filter((n) => groupOf(n.at, serverNow) === title) }))
        .filter((g) => g.list.length > 0);

    return (
        <div className="max-w-7xl mx-auto p-2 md:p-6">
            <div className="md:flex justify-between items-center mb-8">
                <h1 className="text-xl md:text-3xl font-bold">{t("title")}</h1>
                <NotificationTabs
                    active={active}
                    setActive={setActive}
                />
            </div>

            {showTools && (
                <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
                    {selecting ? (
                        <>
                            <span className="mr-auto text-sm text-gray-500 dark:text-neutral-400">
                                {t("selectedCount", { count: selected.size })}
                            </span>
                            <button type="button" onClick={toggleAll} className="border rounded-xl px-4 py-2 text-sm text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-dark-card">
                                {allTicked ? t("deselectAll") : t("selectAll")}
                            </button>
                            <button
                                type="button"
                                onClick={() => setAsk("selected")}
                                disabled={selected.size === 0}
                                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                                <Trash2 size={16} />
                                {t("deleteSelected")}
                            </button>
                            <button type="button" onClick={stopSelecting} className="border rounded-xl px-4 py-2 text-sm text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-dark-card">
                                {c("cancel")}
                            </button>
                        </>
                    ) : (
                        <>
                            <button type="button" onClick={() => setSelecting(true)} className="border rounded-xl px-4 py-2 text-sm text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-dark-card">
                                {t("select")}
                            </button>
                            <button type="button" onClick={() => setAsk("all")} className="flex items-center gap-2 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950">
                                <Trash2 size={16} />
                                {t("deleteAll")}
                            </button>
                        </>
                    )}
                </div>
            )}

            {loading ? (
                <Skeleton />
            ) : error ? (
                <div className="text-center py-16">
                    <p className="text-gray-500 dark:text-neutral-400 mb-4">{t("loadFailed")}</p>
                    <button type="button" onClick={() => load(active)} className="border border-red-500 text-red-500 px-4 py-2 rounded-full">
                        {c("retry")}
                    </button>
                </div>
            ) : groups.length === 0 ? (
                <p className="text-center py-16 text-gray-500 dark:text-neutral-400">{t(`empty_${TAB_PARAM[active]}`)}</p>
            ) : (
                <>
                    {groups.map((group, i) => (
                        <div key={group.title} className={i > 0 ? "mt-10" : undefined}>
                            <NotificationSection title={t(`group_${group.title}`)}>
                                {group.list.map((n) => {
                                    const parts = cardParts(n, serverNow, t, ct);
                                    const card = (
                                        <NotificationCard
                                            highlighted={!n.read}
                                            icon={parts.icon}
                                            title={parts.title}
                                            subtitle={parts.subtitle}
                                            action={parts.action}
                                        />
                                    );
                                    // While choosing, the whole row ticks / unticks and the card's own buttons are switched off
                                    if (selecting) {
                                        return (
                                            <div key={n.id} onClick={() => toggle(n.id)} className="flex cursor-pointer items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(n.id)}
                                                    onChange={() => toggle(n.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="h-4 w-4 shrink-0 accent-red-600"
                                                />
                                                <div className="pointer-events-none min-w-0 flex-1">{card}</div>
                                            </div>
                                        );
                                    }
                                    return parts.wholeCardLink && n.href ? (
                                        <Link key={n.id} href={n.href} className="block">
                                            {card}
                                        </Link>
                                    ) : (
                                        <div key={n.id}>{card}</div>
                                    );
                                })}
                            </NotificationSection>
                        </div>
                    ))}

                    <div ref={sentinel} />
                    {loadingMore && (
                        <div className="mt-4">
                            <Skeleton />
                        </div>
                    )}
                </>
            )}

            {/* Delete popup */}
            {ask && (
                <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
                    <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in duration-300">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {ask === "selected" ? t("deleteTitleSelected") : t(`deleteTitleAll_${TAB_PARAM[active]}`)}
                        </h2>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t("deleteText")}</p>
                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setAsk(null)}
                                disabled={deleting}
                                className="flex-1 rounded-xl border py-3 font-semibold text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-60">
                                {c("cancel")}
                            </button>
                            <button
                                type="button"
                                onClick={confirmDelete}
                                disabled={deleting}
                                className="flex-1 rounded-xl bg-red-600 py-3 font-semibold text-white disabled:opacity-60">
                                {deleting ? t("deleting") : c("delete")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}