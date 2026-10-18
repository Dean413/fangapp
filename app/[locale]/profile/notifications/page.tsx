"use client";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import NotificationTabs from "@/components/profile-components/notification/notification-tabs";
import NotificationCard from "@/components/profile-components/notification/notification-cards";
import NotificationSection from "@/components/profile-components/notification/notification-section";
import { FaBookOpen, FaClock, FaCrown, FaGift } from "react-icons/fa6";
import { FaUnlockAlt } from "react-icons/fa";

type Kind = "new_chapter" | "coins_added" | "coins_spent" | "coins_expired" | "bonus_expiring" | "checkin_ready" | "reply";

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
    description?: string;
    code?: string;
    expiresAt?: string;
    day?: number;
    coins?: number;
    claimable?: boolean;
};

const TAB_PARAM: Record<string, string> = { All: "all", Unread: "unread", Mentions: "mentions", Transactions: "transactions" };

const EMPTY_TEXT: Record<string, string> = {
    All: "No notifications yet",
    Unread: "You're all caught up",
    Mentions: "No mentions yet",
    Transactions: "No transactions yet",
};

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

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function timeText(iso: string, now: number): string {
    const t = new Date(iso).getTime();
    const group = groupOf(iso, now);
    if (group === "Yesterday") return "Yesterday";
    if (group === "Earlier") {
        const d = new Date(t);
        const sameYear = d.getFullYear() === new Date(now).getFullYear();
        return d.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
    }
    const seconds = Math.max(0, Math.round((now - t) / 1000));
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${plural(Math.floor(seconds / 60), "min")} ago`;
    return `${plural(Math.floor(seconds / 3600), "hour")} ago`;
}

function expiresText(iso: string | undefined, now: number): string {
    if (!iso) return "expire soon";
    const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
    if (seconds <= 0) return "have expired";
    if (seconds < 3600) return `expire in ${plural(Math.max(1, Math.floor(seconds / 60)), "min")}`;
    return `expire in ${plural(Math.floor(seconds / 3600), "hour")}`;
}

// ---------- Cards ----------

const Spent = ({ amount }: { amount: number }) => (
    <div className="flex gap-3">
        <p className="text-red-500 font-semibold"> -{Math.abs(amount)} </p>
        <Image src={COIN} alt="coins" width={20} height={10} />
    </div>
);

type CardParts = { icon: ReactNode; title: ReactNode; subtitle?: string; action?: ReactNode; wholeCardLink?: boolean };

function cardParts(n: Notification, now: number): CardParts {
    const time = timeText(n.at, now);
    const amount = n.amount ?? 0;

    switch (n.kind) {
        case "new_chapter":
            return {
                icon: (
                    <div className="bg-red-500 p-3 rounded-xl text-white">
                        <FaBookOpen size={20} />
                    </div>
                ),
                title: (
                    <>
                        <strong>{n.author}</strong> updated
                        <strong> {n.storyTitle}</strong>
                    </>
                ),
                subtitle: `${time} • Chapter ${n.chapter}`,
                action: n.href ? (
                    <Link href={n.href} className="bg-red-500 text-white px-5 py-2 rounded-full">
                        Read
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
                    title: <strong>{amount} Coins Purchased</strong>,
                    subtitle: `#${n.code}`,
                    action: <span className="font-semibold text-green-600"> +{amount} 🪙</span>,
                    wholeCardLink: true,
                };
            }
            return {
                icon: (
                    <div className="bg-yellow-100 dark:bg-yellow-500/15 p-3 rounded-xl">
                        <Image src={COIN} alt="coins" width={20} height={20} />
                    </div>
                ),
                title: (
                    <>
                        You received <strong>{amount} coins</strong>
                    </>
                ),
                subtitle: `${time} • ${n.description}`,
                wholeCardLink: true,
            };

        case "coins_spent":
            if (n.reason === "vip") {
                return {
                    icon: (
                        <div className="bg-red-100 dark:bg-red-500/15 p-3 rounded-xl">
                            <FaCrown size={20} color="red" />
                        </div>
                    ),
                    title: "VIP Subscription",
                    subtitle: time,
                    action: <Spent amount={amount} />,
                    wholeCardLink: true,
                };
            }
            return {
                icon: (
                    <div className="bg-indigo-100 dark:bg-indigo-500/15 p-3 rounded-xl">
                        <FaUnlockAlt size={20} color="purple" />
                    </div>
                ),
                title: n.reason === "unlock" ? "Chapter Unlocked" : n.description,
                subtitle: time,
                action: <Spent amount={amount} />,
                wholeCardLink: true,
            };

        case "coins_expired":
            return {
                icon: (
                    <div className="bg-gray-100 dark:bg-dark-raised p-3 rounded-xl">
                        <Image src={COIN} alt="coins" width={20} height={20} />
                    </div>
                ),
                title: (
                    <>
                        <strong>{Math.abs(amount)} bonus coins</strong> expired
                    </>
                ),
                subtitle: `${time} • ${n.description}`,
                action: <Spent amount={amount} />,
                wholeCardLink: true,
            };

        case "bonus_expiring":
            return {
                icon: (
                    <div className="bg-yellow-100 dark:bg-yellow-500/15 p-3 rounded-xl text-yellow-600">
                        <FaClock size={20} />
                    </div>
                ),
                title: (
                    <>
                        <strong>{amount} bonus coins</strong> {expiresText(n.expiresAt, now)}
                    </>
                ),
                subtitle: `${time} • Use them before they run out`,
                action: n.href ? (
                    <Link href={n.href} className="border border-red-500 text-red-500 px-4 py-2 rounded-full">
                        View
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
                title: (
                    <>
                        Your <strong>Day {n.day}</strong> check-in is ready
                    </>
                ),
                subtitle: `${time} • +${n.coins} bonus coins`,
                action: n.claimable && n.href ? (
                    <Link href={n.href} className="bg-red-500 text-white px-5 py-2 rounded-full">
                        Claim
                    </Link>
                ) : undefined,
            };

        default:
            return {
                icon: (
                    <div className="bg-gray-100 dark:bg-dark-raised p-3 rounded-xl">
                        <UserPlus />
                    </div>
                ),
                title: n.description || "New reply",
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
    const [active, setActive] = useState("Unread");
    const [items, setItems] = useState<Notification[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(false);
    // server time minus this device's time, so "2 mins ago" is right whatever the device clock says
    const [offset, setOffset] = useState(0);
    const [now, setNow] = useState<number>(Date.now());

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
    const groups: { title: Group; list: Notification[] }[] = (["Today", "Yesterday", "Earlier"] as Group[])
        .map((title) => ({ title, list: items.filter((n) => groupOf(n.at, serverNow) === title) }))
        .filter((g) => g.list.length > 0);

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="md:flex justify-between items-center mb-8">
                <h1 className="text-xl md:text-3xl font-bold">Notifications</h1>
                <NotificationTabs
                    active={active}
                    setActive={setActive}
                />
            </div>

            {loading ? (
                <Skeleton />
            ) : error ? (
                <div className="text-center py-16">
                    <p className="text-gray-500 dark:text-neutral-400 mb-4">Couldn&apos;t load your notifications.</p>
                    <button type="button" onClick={() => load(active)} className="border border-red-500 text-red-500 px-4 py-2 rounded-full">
                        Try again
                    </button>
                </div>
            ) : groups.length === 0 ? (
                <p className="text-center py-16 text-gray-500 dark:text-neutral-400">{EMPTY_TEXT[active]}</p>
            ) : (
                <>
                    {groups.map((group, i) => (
                        <div key={group.title} className={i > 0 ? "mt-10" : undefined}>
                            <NotificationSection title={group.title}>
                                {group.list.map((n) => {
                                    const parts = cardParts(n, serverNow);
                                    const card = (
                                        <NotificationCard
                                            highlighted={!n.read}
                                            icon={parts.icon}
                                            title={parts.title}
                                            subtitle={parts.subtitle}
                                            action={parts.action}
                                        />
                                    );
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
        </div>
    );
}