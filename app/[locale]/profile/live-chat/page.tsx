"use client";
// app/[locale]/profile/live-chat/page.tsx
// Live Chat with FANG. Topics, options and answers come from the database (/api/live-chat).
// No chat yet: bot greeting + topic buttons. In a chat: messages, "We're here to help!", input. A resolved chat opens a rating pop-up (Skip closes the chat).
// While an agent has the chat (waiting / active) it checks for new messages: every 3 seconds right after something happens,
// then slower the longer the chat is quiet. Each check is tiny: the server only sends the chat again when something changed.

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/store/toastStore";

type ChatButton = { type: "option"; id: string; label: string } | { type: "answer"; value: "yes" | "no"; label: string };
type ChatMessage = { id: string; sender: "user" | "bot" | "staff"; staffName: string | null; body: string; buttons: ChatButton[] | null; createdAt: string };
type ChatConversation = { id: string; status: "bot" | "waiting" | "active" | "resolved"; topicLabel: string | null; rating: number | null; createdAt: string; resolvedAt: string | null };
type ChatTopic = { id: string; icon: string | null; label: string };
type ChatData = { topics: ChatTopic[]; suspended: boolean; token: string; conversation: ChatConversation | null; messages: ChatMessage[] };
type ChatReply = Partial<ChatData> & { message?: string; unchanged?: boolean };

const MAX_LENGTH = 2000;
const BOT_IMAGE = "/fang_pictures/fangbot.png";
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

// How often to check for new messages: quick right after something happens, slower the longer the chat is quiet
function pollDelay(idleMs: number) {
    if (idleMs < 60000) return 3000;
    if (idleMs < 300000) return 8000;
    return 20000;
}

async function callChat(init?: RequestInit, token?: string | null): Promise<{ ok: boolean; data: ChatReply }> {
    try {
        const url = token ? `/api/live-chat?token=${encodeURIComponent(token)}` : "/api/live-chat";
        const res = await fetch(url, { credentials: "include", cache: "no-store", ...init });
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, data };
    } catch {
        return { ok: false, data: {} };
    }
}

function SendIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
        </svg>
    );
}

export default function FangBot() {
    const t = useTranslations("LiveChat");
    const [data, setData] = useState<ChatData | null>(null);
    const [text, setText] = useState("");
    const [busy, setBusy] = useState(false);
    const [hoverStar, setHoverStar] = useState(0);
    const [picked, setPicked] = useState(0);
    const [showRate, setShowRate] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const lastCount = useRef(0);
    const tokenRef = useRef<string | null>(null); // what the server last told us about this chat
    const activityRef = useRef(Date.now()); // when the chat last changed (sets the polling speed)

    // Take in a fresh chat state; if it differs from what we had, the chat is "active" again, so polling speeds back up
    const apply = useCallback((res: ChatData) => {
        if (res.token !== tokenRef.current) activityRef.current = Date.now();
        tokenRef.current = res.token ?? null;
        setData(res);
    }, []);

    // poll = true: send the token we hold, and the server answers "unchanged" when nothing is new
    const load = useCallback(
        async (poll = false) => {
            const { ok, data: res } = await callChat(undefined, poll ? tokenRef.current : null);
            if (ok && !res.unchanged) apply(res as ChatData);
            return ok;
        },
        [apply]
    );

    useEffect(() => {
        load().then((ok) => {
            if (!ok) toast.error("Couldn't load Live Chat. Please try again.");
        });
    }, [load]);

    // Poll only while an agent has (or is about to take) the chat, and only when the tab is visible
    const status = data?.conversation?.status;
    useEffect(() => {
        if (status !== "waiting" && status !== "active") return;
        let stopped = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const schedule = (ms: number) => {
            clearTimeout(timer);
            if (!stopped) timer = setTimeout(tick, ms);
        };
        const tick = async () => {
            if (!document.hidden) await load(true);
            schedule(pollDelay(Date.now() - activityRef.current));
        };
        // Coming back to the tab: check right away and go back to the quick pace
        const onVisible = () => {
            if (document.hidden) return;
            activityRef.current = Date.now();
            tick();
        };
        document.addEventListener("visibilitychange", onVisible);
        schedule(pollDelay(Date.now() - activityRef.current));
        return () => {
            stopped = true;
            clearTimeout(timer);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [status, load]);

    // Keep the newest message in view
    const messageCount = data?.messages.length ?? 0;
    useEffect(() => {
        if (messageCount !== lastCount.current && scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: lastCount.current ? "smooth" : "auto" });
        }
        lastCount.current = messageCount;
    }, [messageCount]);

    const conversation = data?.conversation ?? null;
    const messages = data?.messages ?? [];
    const suspended = data?.suspended ?? false;
    const disabled = busy || suspended || !data;

    async function act(payload: Record<string, unknown>) {
        if (busy) return false;
        setBusy(true);
        const { ok, data: res } = await callChat({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        setBusy(false);
        if (ok) {
            apply(res as ChatData);
            return true;
        }
        if (res.suspended) setData((d) => (d ? { ...d, suspended: true } : d));
        toast.error(res.message || "Something went wrong. Please try again.");
        load();
        return false;
    }

    async function send() {
        const value = text.trim();
        if (!value || busy || data?.suspended) return;
        if (await act({ action: "message", text: value })) setText("");
    }

    async function rate(stars: number) {
        if (!conversation || conversation.status !== "resolved" || conversation.rating) return;
        if (await act({ action: "rate", conversationId: conversation.id, rating: stars })) toast.success("Thank you for your feedback!");
    }

    // Skip the rating: the chat closes and the greeting comes back
    async function skip() {
        if (!conversation || conversation.status !== "resolved") return;
        await act({ action: "skip", conversationId: conversation.id });
    }

    // Only the newest bot message's buttons work, and only while the bot has the chat
    const lastMessage = messages[messages.length - 1];
    const liveButtonsId = conversation?.status === "bot" && lastMessage?.sender === "bot" ? lastMessage.id : null;
    const needsRating = conversation?.status === "resolved" && !conversation.rating;

    // Show the rating pop-up a moment after the chat is resolved, so the last message can be read first
    useEffect(() => {
        if (!needsRating) {
            setShowRate(false);
            setPicked(0);
            return;
        }
        const timer = setTimeout(() => setShowRate(true), 700);
        return () => clearTimeout(timer);
    }, [needsRating]);

    // Escape closes the pop-up (same as Skip)
    useEffect(() => {
        if (!showRate) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") skip();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showRate, conversation?.id, busy]);

    // Rating pop-up: appears once the chat is resolved. Skipping closes the chat without a rating.
    const ratingModal = showRate && conversation ? (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => !busy && skip()}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Rate your chat experience"
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-xl bg-white dark:bg-dark-card px-6 py-6 text-center shadow-xl ring-1 ring-gray-200 dark:ring-neutral-700">
                <p className="text-lg font-bold text-gray-800 dark:text-neutral-100">Rate your chat experience</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">How was your chat with FANG support?</p>
                <div className="mt-4 flex justify-center gap-1" onMouseLeave={() => setHoverStar(0)}>
                    {[1, 2, 3, 4, 5].map((n) => (
                        <button
                            key={n}
                            type="button"
                            disabled={busy}
                            onMouseEnter={() => setHoverStar(n)}
                            onClick={() => setPicked(n)}
                            aria-label={`${n} star${n > 1 ? "s" : ""}`}
                            className={`text-4xl leading-none transition-colors ${n <= (hoverStar || picked) ? "text-pink-500" : "text-pink-200 dark:text-pink-300/40"}`}>
                            ★
                        </button>
                    ))}
                </div>
                <div className="mt-6 flex justify-center gap-3">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={skip}
                        className="rounded-full border px-5 py-2 text-sm font-medium border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-200 enabled:hover:bg-gray-100 dark:enabled:hover:bg-neutral-700 disabled:opacity-60">
                        Skip
                    </button>
                    <button
                        type="button"
                        disabled={busy || !picked}
                        onClick={() => rate(picked)}
                        className="rounded-full px-5 py-2 text-sm font-semibold text-white bg-red-500 enabled:hover:bg-red-600 disabled:opacity-60">
                        Submit
                    </button>
                </div>
            </div>
        </div>
    ) : null;

    const inputBar = (
        <div className="border-t border-gray-300 dark:border-neutral-700 px-4 py-3 flex items-center gap-3">
            <input
                type="text"
                value={text}
                maxLength={MAX_LENGTH}
                disabled={suspended}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) send();
                }}
                placeholder={t("placeholder")}
                className="flex-1 bg-gray-100 dark:bg-dark-raised rounded-full px-4 py-2 text-sm text-gray-700 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-60"
            />
            <button
                onClick={send}
                disabled={disabled || !text.trim()}
                aria-label="Send"
                className="w-10 h-10 shrink-0 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors disabled:opacity-60"
            >
                <SendIcon />
            </button>
        </div>
    );

    // ---------------- No chat yet: greeting + topics ----------------
    if (!conversation) {
        return (
            <div className="flex items-start justify-center bg-gray-50 dark:bg-black/10 px-4 py-10">
                <div className="flex flex-col w-[80%] bg-white dark:bg-dark-card border rounded-lg border-gray-300 dark:border-neutral-700 h-150 my-6">
                    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
                        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center mb-4">
                            <Image src={BOT_IMAGE} alt="fang bot" width={100} height={100} />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-neutral-100 mb-2">{t("greeting")}</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base text-center mb-8">
                            Hi! I&apos;m Ava, your Fang assistant. Ask me a question or <br className="hidden sm:block" />
                            select a topic below, and I&apos;ll be happy to help.
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-[80%]">
                            {(data?.topics ?? []).map((topic) => (
                                <button
                                    key={topic.id}
                                    disabled={disabled}
                                    onClick={() => act({ action: "topic", topicId: topic.id })}
                                    className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm text-gray-700 dark:text-neutral-200 hover:bg-pink-50 dark:hover:bg-pink-500/10 hover:border-pink-300 dark:hover:border-pink-500/40 transition-colors disabled:opacity-60 disabled:hover:bg-transparent"
                                >
                                    {topic.icon && <span>{topic.icon}</span>}
                                    <span className="text-left leading-tight">{topic.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    {inputBar}
                </div>
            </div>
        );
    }

    // ---------------- In a chat ----------------
    return (
        <div className="flex flex-col mx-auto w-[80%] bg-white dark:bg-dark-card border rounded-lg border-gray-300 dark:border-neutral-700 my-6">
            <h1 className="px-4 pt-4 pb-3 text-lg font-bold text-gray-800 dark:text-neutral-100">Live Chat with FANG</h1>
            <div
                ref={scrollRef}
                className="mx-4 border border-gray-200 dark:border-neutral-700 rounded-md px-3 sm:px-5 py-4 h-[60vh] min-h-80 overflow-y-auto flex flex-col gap-5"
            >
                {messages.map((m) => {
                    const mine = m.sender === "user";
                    const live = m.id === liveButtonsId;
                    return (
                        <div key={m.id} className={`flex gap-3 ${mine ? "justify-end" : "justify-start"}`}>
                            {!mine && (
                                <div className="w-7 h-7 shrink-0 rounded-full bg-gray-200 dark:bg-neutral-700 overflow-hidden flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-neutral-200">
                                    {m.sender === "bot" ? (
                                        <Image src={BOT_IMAGE} alt="" width={28} height={28} />
                                    ) : (
                                        (m.staffName ?? "S").charAt(0).toUpperCase()
                                    )}
                                </div>
                            )}
                            <div className={`max-w-[85%] sm:max-w-[70%] flex flex-col ${mine ? "items-end" : "items-start"}`}>
                                {m.sender === "staff" && (
                                    <span className="mb-1 text-xs font-medium text-gray-500 dark:text-neutral-400">{m.staffName}</span>
                                )}
                                <div className="rounded-md bg-gray-50 dark:bg-dark-raised px-4 py-3 text-sm text-gray-800 dark:text-neutral-100">
                                    <p className="whitespace-pre-line wrap-break-word">{m.body}</p>

                                    {m.buttons?.some((b) => b.type === "option") && (
                                        <div className="mt-3 flex flex-col gap-2">
                                            <span className="text-gray-600 dark:text-neutral-300">Options:</span>
                                            {m.buttons.map((b) =>
                                                b.type === "option" ? (
                                                    <button
                                                        key={b.id}
                                                        disabled={!live || disabled}
                                                        onClick={() => act({ action: "option", optionId: b.id })}
                                                        className="text-left px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card enabled:hover:bg-pink-50 dark:enabled:hover:bg-pink-500/10 enabled:hover:border-pink-300 transition-colors disabled:opacity-60"
                                                    >
                                                        {b.label}
                                                    </button>
                                                ) : null
                                            )}
                                        </div>
                                    )}

                                    {m.buttons?.some((b) => b.type === "answer") && (
                                        <div className="mt-3 flex gap-2">
                                            {m.buttons.map((b) =>
                                                b.type === "answer" ? (
                                                    <button
                                                        key={b.value}
                                                        disabled={!live || disabled}
                                                        onClick={() => act({ action: "answer", answer: b.value })}
                                                        className={`min-w-16 px-4 py-1.5 rounded-full text-sm font-medium transition-colors disabled:opacity-60 ${b.value === "yes"
                                                            ? "bg-red-500 text-white enabled:hover:bg-red-600"
                                                            : "border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-200 enabled:hover:bg-gray-100 dark:enabled:hover:bg-neutral-700"
                                                            }`}
                                                    >
                                                        {b.label}
                                                    </button>
                                                ) : null
                                            )}
                                        </div>
                                    )}

                                    <span className="mt-3 block text-[10px] text-gray-400 dark:text-neutral-500">{timeOf(m.createdAt)}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="px-4 pt-4 pb-3">
                <p className="font-bold text-gray-800 dark:text-neutral-100">We&apos;re here to help! 💬</p>
                <p className="text-sm text-gray-500 dark:text-neutral-400">Ava will assist you with your concern.</p>
            </div>

            {inputBar}
            {ratingModal}
        </div>
    );
}