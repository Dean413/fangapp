"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "@/lib/store/toastStore";
import { useAuthStore } from "@/lib/store/authStore";

const FALLBACK_COVER = "/fang_pictures/bookFace.png";
const MAX_GEMS_PER_VOTE = 1000;

type Gift = { id: number; slug: string; name: string; icon: string; coins: number };
type PanelFan = { rank: number; name: string | null; avatar: string | null; points: number; you: boolean };
type Panel = { gifts: number; fans: PanelFan[]; me: { rank: number | null; points: number } };

const rubyTasks = [
    { id: 1, title: "readingTask", amount: "+1", desc: "readingTaskDesc" },
    { id: 2, title: "topUp", amount: "+3", desc: "topUpDesc" },
];

type GiftCardProps = {
    onClose: () => void;
    title?: string;
    image?: string;
    book: string; // the book's slug
    initial?: "gifts" | "ruby"; // which tab opens first
};

// A fan's photo, or their initial when there is none (or it fails to load)
function Face({ name, src }: { name: string | null; src: string | null }) {
    const [failed, setFailed] = useState(false);
    const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
    return (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-[11px] font-semibold text-gray-600 dark:bg-dark-raised dark:text-neutral-300">
            {src && !failed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={name ?? ""} onError={() => setFailed(true)} className="h-full w-full object-cover" />
            ) : initial}
        </span>
    );
}

export default function GiftCard({ onClose, title, image, book, initial = "gifts" }: GiftCardProps) {
    const t = useTranslations("Gift");
    const f = useTranslations("Fans");
    const locale = useLocale();
    const user = useAuthStore((s) => s.user);
    const wallet = user?.wallet;
    // Gifts can only be paid with bought coins; votes with gems
    const boughtCoins = wallet?.coins ?? 0;
    const ownedGems = wallet?.gems ?? 0;

    const [active, setActive] = useState<"gifts" | "ruby">(initial);
    const [gifts, setGifts] = useState<Gift[]>([]);
    const [giftsLoading, setGiftsLoading] = useState(true);
    const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
    const [selectedGems, setSelectedGems] = useState(0);
    const [voters, setVoters] = useState<number | null>(null);
    const [panel, setPanel] = useState<Panel | null>(null);
    const [sending, setSending] = useState(false);
    const busy = useRef(false); // blocks a second tap before the page re-draws

    const n = (value: number) => new Intl.NumberFormat(locale).format(value);

    // The gifts on offer
    useEffect(() => {
        let alive = true;
        fetch("/api/gifts", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => { if (alive && Array.isArray(data?.gifts)) setGifts(data.gifts); })
            .catch(() => { })
            .finally(() => { if (alive) setGiftsLoading(false); });
        return () => { alive = false; };
    }, []);

    // This month's voters for the book
    useEffect(() => {
        if (!book) return;
        let alive = true;
        fetch(`/api/votes?book=${encodeURIComponent(book)}`, { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => { if (alive && data?.votes) setVoters(Number(data.votes.voters) || 0); })
            .catch(() => { });
        return () => { alive = false; };
    }, [book]);

    // This month's gifts for the book: the count, the top fans and the reader's own place
    const loadPanel = useCallback(() => {
        if (!book) return;
        fetch(`/api/stories/${encodeURIComponent(book)}/fans/panel`, { credentials: "include", cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => { if (data) setPanel(data); })
            .catch(() => { });
    }, [book]);

    useEffect(() => { loadPanel(); }, [loadPanel]);

    // Keep the chosen number of gems within what the reader has
    const maxGems = Math.min(ownedGems, MAX_GEMS_PER_VOTE);
    useEffect(() => {
        setSelectedGems((g) => Math.min(g, maxGems));
    }, [maxGems]);

    const applyWallet = (next: unknown) => {
        const current = useAuthStore.getState().user;
        if (current && next) useAuthStore.getState().setUser({ ...current, wallet: next as typeof current.wallet });
    };

    const post = async (url: string, body: object) => {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (data?.wallet) applyWallet(data.wallet);
        return { ok: res.ok, data };
    };

    const sendGift = async () => {
        if (busy.current || !selectedGift) return;
        busy.current = true;
        setSending(true);
        try {
            const { ok, data } = await post("/api/gifts", { book, gift: selectedGift.id });
            if (!ok) return void toast.error(data.message || t("sendFailed"));
            toast.success(data.message || t("giftSent", { gift: selectedGift.name }));
            setSelectedGift(null);
            loadPanel(); // the new gift moves the ranking
        } catch {
            toast.error(t("sendFailed"));
        } finally {
            busy.current = false;
            setSending(false);
        }
    };

    const vote = async () => {
        if (busy.current || selectedGems < 1) return;
        busy.current = true;
        setSending(true);
        try {
            const { ok, data } = await post("/api/votes", { book, gems: selectedGems });
            if (!ok) return void toast.error(data.message || t("voteFailed"));
            toast.success(data.message || t("votesSent", { count: selectedGems }));
            if (data?.votes) setVoters(Number(data.votes.voters) || 0);
            setSelectedGems(0);
        } catch {
            toast.error(t("voteFailed"));
        } finally {
            busy.current = false;
            setSending(false);
        }
    };

    const canAffordSelected = selectedGift ? boughtCoins >= selectedGift.coins : false;
    const me = panel?.me ?? { rank: null, points: 0 };

    return (
        <div className="fixed inset-0 z-50 flex">
            <div className="flex-1" onClick={onClose} />
            <div className="w-80 md:w-125 fixed md:right-15 right-5 top-1/2 -translate-y-1/2 max-h-[92vh] overflow-y-auto bg-white dark:bg-dark-card rounded-xl shadow-xl z-50">
                {/* Tabs */}
                <div className="flex border-b border-gray-500 dark:border-neutral-600">
                    <button type="button" onClick={() => setActive("ruby")}
                        className={`w-1/2 py-5 text-sm font-semibold ${active === "ruby" ? "bg-red-200 dark:bg-red-500/25" : ""} text-black dark:text-white rounded-t-xl`}>
                        {t("ruby")}
                    </button>

                    <button type="button" onClick={() => setActive("gifts")}
                        className={`w-1/2 py-5 text-sm font-semibold ${active === "gifts" ? "bg-red-200 dark:bg-red-500/25" : ""} text-black dark:text-white rounded-t-xl`}>
                        {t("gifts")}
                    </button>
                </div>

                {/* Header */}
                {/* <div className="flex items-center justify-between gap-3 bg-red-100 dark:bg-red-500/15 px-4 py-3 font-semibold text-gray-800 dark:text-neutral-100">
                    <span>{t("fansContribution")}</span>
                    {active === "gifts" && user && (
                        <span className="text-xs font-medium text-gray-600 dark:text-neutral-300">
                            {t("boughtCoins", { count: boughtCoins })}
                        </span>
                    )}
                </div> */}

                {/* Gifts: what the book received this month and who gave the most */}
                {/* {active === "gifts" && panel && (
                    <div className="px-4 pt-4">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{f("giftsReceived", { count: panel.gifts })}</p>
                        {panel.fans.length === 0 ? (
                            <p className="mt-2 text-xs text-gray-500 dark:text-neutral-400">{f("noGiftsYet")}</p>
                        ) : (
                            <div className="mt-2 divide-y divide-gray-100 dark:divide-dark-border">
                                {panel.fans.map((fan) => (
                                    <div key={fan.rank} className="flex items-center gap-3 py-2">
                                        <span className="w-6 text-xs text-gray-500 dark:text-neutral-400">{String(fan.rank).padStart(2, "0")}</span>
                                        <Face name={fan.name} src={fan.avatar} />
                                        <span className="min-w-0 flex-1 truncate text-sm text-gray-900 dark:text-white">{fan.name ?? f("anonymous")}</span>
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">{n(fan.points)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )} */}

                {/* Gifts */}
                {active === "gifts" && (
                    <div className="grid grid-cols-4 md:grid-cols-4 gap-1 md:gap-5 p-2 md:p-6">
                        {giftsLoading
                            ? Array.from({ length: 12 }, (_, i) => (
                                <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100 dark:bg-dark-raised" />
                            ))
                            : gifts.map((gift) => (
                                <button key={gift.id} type="button" onClick={() => setSelectedGift(gift)} disabled={sending}
                                    className={`flex flex-col items-center justify-center p-3 rounded-lg border bg-white dark:bg-dark-card shadow-sm hover:shadow-md transition cursor-pointer disabled:cursor-not-allowed
                                    ${selectedGift?.id === gift.id ? "bg-red-100 dark:bg-red-500/15 border-red-500" : "border-gray-200 dark:border-dark-border"}`}>
                                    <Image src={gift.icon} alt={gift.name} width={28} height={28} className="mb-2" />
                                    <p className="text-xs font-medium text-gray-700 dark:text-neutral-200 text-center">
                                        {t("coinsPrice", { count: gift.coins })}
                                    </p>
                                </button>
                            ))}
                    </div>
                )}

                {/* Ruby */}
                {active === "ruby" && (
                    <div className="p-4">
                        <div className="flex items-center gap-3 mb-5">
                            <Image src={image || FALLBACK_COVER} alt={title ?? ""} width={100} height={100} className="rounded-lg" />
                            <div className="min-w-0">
                                <p className="font-semibold text-gray-900 dark:text-white line-clamp-2">{title}</p>
                                {voters !== null && (
                                    <p className="text-sm text-gray-600 dark:text-neutral-300">{t("readersVoted", { count: voters })}</p>
                                )}
                            </div>
                        </div>
                        <h2 className="text-red-400 text-xl mb-5">{t("howToGet")}</h2>
                        <div>
                            {rubyTasks.map((task) => (
                                <div className="flex justify-between items-center mb-5" key={task.id}>
                                    <div>
                                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                            <span>{t(task.title)}</span>
                                            <Image src="/fang_pictures/gift-icons/ruby.png" alt="gems" width={20} height={20} />
                                            <span className="text-red-500">{task.amount}</span>
                                        </div>
                                        <p className="text-[8px] md:text-xs text-gray-500 dark:text-neutral-400">{t(task.desc)}</p>
                                    </div>

                                    {task.title === "topUp" && (
                                        <Link href="/profile/wallet" className="text-red-500 text-xs md:text-sm font-semibold">
                                            {t("topUpLink")} {">"}
                                        </Link>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between items-center mt-8">
                            <div>
                                <div className="border rounded-full px-4 py-1 flex gap-3 items-center">
                                    <button type="button" disabled={sending || selectedGems <= 0}
                                        onClick={() => setSelectedGems((prev) => Math.max(0, prev - 1))}
                                        className="disabled:opacity-40" aria-label="-">
                                        -
                                    </button>
                                    <span>{selectedGems}</span>
                                    <button type="button" disabled={sending || selectedGems >= maxGems}
                                        onClick={() => setSelectedGems((prev) => Math.min(maxGems, prev + 1))}
                                        className="disabled:opacity-40" aria-label="+">
                                        +
                                    </button>
                                </div>

                                <div className="text-sm">
                                    <p>{t("gemsLeft", { count: ownedGems - selectedGems })}</p>
                                </div>
                            </div>
                            <button type="button" disabled={selectedGems === 0 || sending} onClick={vote}
                                className={`${selectedGems === 0 || sending ? "bg-red-200 dark:bg-red-500/25 cursor-not-allowed" : "bg-red-700 cursor-pointer"} text-white px-8 py-3 rounded-full font-semibold flex items-center gap-3`}>
                                <Image src="/fang_pictures/gift-icons/ruby.png" alt="gems" width={20} height={20} />
                                <span>{sending ? t("sending") : t("vote")}</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Your place, and the button that sends the chosen gift */}
                {/* Send */}
                {active === "gifts" && (
                    <div className="p-4">
                        {selectedGift && user && !canAffordSelected && (
                            <p className="mb-2 text-center text-xs text-red-600 dark:text-red-400">
                                {t("needBoughtCoins")}{" "}
                                <Link href="/profile/wallet" className="font-semibold underline">{t("topUpLink")}</Link>
                            </p>
                        )}
                        <button type="button" disabled={!selectedGift || sending} onClick={sendGift}
                            className={`w-full py-3 rounded-full ${selectedGift && !sending ? "bg-red-700 cursor-pointer" : "bg-red-300 cursor-not-allowed"} text-white font-semibold transition`}>
                            {sending ? t("sending") : t("send")}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}