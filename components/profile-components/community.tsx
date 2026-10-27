"use client";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { Flame, Globe, Heart, Image as ImageIcon, MessageCircle, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuthStore } from "@/lib/store/authStore";
import { useAuthModals } from "@/lib/store/auth-card-store";
import { toast } from "@/lib/store/toastStore";
import { Avatar } from "@/components/reviews/stars";

type Person = { id: string; public_id: string | null; name: string | null; username: string | null; avatar_url: string | null };
type Post = {
    id: string;
    body: string;
    image_url: string | null;
    created_at: string;
    author: Person;
    likes: number;
    comments: number;
    liked: boolean;
    mine: boolean;
};
type Comment = { id: string; post_id: string; body: string; created_at: string; author: Person; mine: boolean };
type Member = Person & { followers: number; following: boolean };
type Trend = { tag: string; posts: number };
type Tab = "all" | "following";

const JSON_HEADERS = { "Content-Type": "application/json" };
const MAX_IMAGE = 2 * 1024 * 1024;

async function call<D>(url: string, init?: RequestInit): Promise<{ ok: boolean; data: Partial<D> & { message?: string } }> {
    try {
        const res = await fetch(url, init);
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, data };
    } catch {
        return { ok: false, data: {} };
    }
}

// "2 hours ago", "yesterday" in the reader's language
function ago(iso: string, locale: string, justNow: string) {
    const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    const units: [Intl.RelativeTimeFormatUnit, number][] = [
        ["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60],
    ];
    for (const [unit, size] of units) {
        if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
    }
    return justNow;
}

// Post text with #hashtags coloured
function Body({ text }: { text: string }) {
    return (
        <p className="text-gray-800 dark:text-neutral-100 text-sm leading-relaxed whitespace-pre-wrap break-words">
            {text.split(/(#[A-Za-z0-9_]{2,30})/g).map((part, i) =>
                i % 2 ? <span key={i} className="text-rose-500 font-medium">{part}</span> : part
            )}
        </p>
    );
}

/* ------------------------------ Post box ------------------------------ */

function Composer({ onCreated }: { onCreated: (post: Post) => void }) {
    const t = useTranslations("Community");
    const user = useAuthStore((s) => s.user);
    const openSignIn = useAuthModals((s) => s.openSignIn);
    const [text, setText] = useState("");
    const [image, setImage] = useState<string | null>(null);
    const [posting, setPosting] = useState(false);
    const busy = useRef(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const pick = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > MAX_IMAGE) {
            toast.error(t("imageInvalid"));
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setImage(String(reader.result));
        reader.readAsDataURL(file);
    };

    const submit = async () => {
        if (busy.current || (!text.trim() && !image)) return;
        busy.current = true;
        setPosting(true);
        const { ok, data } = await call<{ post: Post }>("/api/community/posts", {
            method: "POST",
            headers: JSON_HEADERS,
            body: JSON.stringify({ body: text, image }),
        });
        if (ok && data.post) {
            onCreated(data.post);
            setText("");
            setImage(null);
        } else {
            toast.error(data.message ?? t("error"));
        }
        busy.current = false;
        setPosting(false);
    };

    if (!user) {
        return (
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-4">
                <button onClick={openSignIn}
                    className="w-full text-left bg-gray-100 dark:bg-dark-raised rounded-full px-4 py-2 text-sm text-gray-400 dark:text-neutral-500">
                    {t("signInToPost")}
                </button>
            </div>
        );
    }

    const firstName = (user.full_name || user.username || "").trim().split(" ")[0];

    return (
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-4">
            <div className="flex items-start gap-3 mb-3">
                <Avatar src={user.avatar_url} name={user.full_name || user.username || ""} size={36} />
                <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={2}
                    placeholder={t("placeholder", { name: firstName })}
                    className="flex-1 resize-none bg-gray-100 dark:bg-dark-raised rounded-2xl px-4 py-2 text-sm text-gray-700 dark:text-neutral-200 placeholder-gray-400 dark:placeholder-neutral-500 outline-none focus:ring-2 focus:ring-rose-300" />
            </div>

            {image && (
                <div className="relative mb-3 w-fit">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image} alt="" className="max-h-48 rounded-lg object-cover" />
                    <button onClick={() => setImage(null)} aria-label={t("removeImage")}
                        className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-1">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-dark-border">
                <div>
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={pick} />
                    <button onClick={() => fileRef.current?.click()} disabled={posting}
                        className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-dark-raised px-2 py-1.5 rounded-lg transition-colors disabled:opacity-60">
                        <ImageIcon className="w-4 h-4 text-green-500" /> {t("image")}
                    </button>
                </div>
                <button onClick={submit} disabled={posting || (!text.trim() && !image)}
                    className="bg-red-700 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-1.5 rounded-full transition-colors">
                    {posting ? t("posting") : t("createPost")}
                </button>
            </div>
        </div>
    );
}

/* ------------------------------ A post ------------------------------ */

function PostCard({ post, onChange, onRemove }: {
    post: Post;
    onChange: (id: string, fn: (p: Post) => Post) => void;
    onRemove: (id: string) => void;
}) {
    const t = useTranslations("Community");
    const locale = useLocale();
    const user = useAuthStore((s) => s.user);
    const openSignIn = useAuthModals((s) => s.openSignIn);

    const likeBusy = useRef(false);
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [open, setOpen] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [cursor, setCursor] = useState<string | null>(null);
    const [loadedOnce, setLoadedOnce] = useState(false);
    const [loadingComments, setLoadingComments] = useState(false);
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const sendBusy = useRef(false);
    const [confirmComment, setConfirmComment] = useState<string | null>(null);

    const name = post.author.name ?? t("reader");

    const like = async () => {
        if (!user) return openSignIn();
        if (likeBusy.current) return;
        likeBusy.current = true;
        onChange(post.id, (p) => ({ ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) }));
        const { ok, data } = await call<{ liked: boolean; likes: number }>(`/api/community/posts/${post.id}/like`, { method: "POST" });
        if (ok && typeof data.likes === "number") {
            onChange(post.id, (p) => ({ ...p, liked: !!data.liked, likes: data.likes as number }));
        } else {
            onChange(post.id, (p) => ({ ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) }));
            toast.error(data.message ?? t("error"));
        }
        likeBusy.current = false;
    };

    const remove = async () => {
        if (deleting) return;
        setDeleting(true);
        const { ok, data } = await call(`/api/community/posts/${post.id}`, { method: "DELETE" });
        if (ok) onRemove(post.id);
        else {
            toast.error(data.message ?? t("error"));
            setDeleting(false);
        }
    };

    const loadComments = async (more: boolean) => {
        if (loadingComments) return;
        setLoadingComments(true);
        const url = `/api/community/posts/${post.id}/comments${more && cursor ? `?cursor=${cursor}` : ""}`;
        const { ok, data } = await call<{ comments: Comment[]; nextCursor: string | null }>(url);
        if (ok && data.comments) {
            setComments((prev) => (more ? [...prev, ...data.comments!] : data.comments!));
            setCursor(data.nextCursor ?? null);
            setLoadedOnce(true);
        } else {
            toast.error(data.message ?? t("error"));
        }
        setLoadingComments(false);
    };

    const toggleComments = () => {
        const next = !open;
        setOpen(next);
        if (next && !loadedOnce) loadComments(false);
    };

    const send = async () => {
        if (!user) return openSignIn();
        const body = draft.trim();
        if (!body || sendBusy.current) return;
        sendBusy.current = true;
        setSending(true);
        const { ok, data } = await call<{ comment: Comment }>(`/api/community/posts/${post.id}/comments`, {
            method: "POST",
            headers: JSON_HEADERS,
            body: JSON.stringify({ body }),
        });
        if (ok && data.comment) {
            setComments((prev) => [data.comment!, ...prev]);
            onChange(post.id, (p) => ({ ...p, comments: p.comments + 1 }));
            setDraft("");
        } else {
            toast.error(data.message ?? t("error"));
        }
        sendBusy.current = false;
        setSending(false);
    };

    const removeComment = async (id: string) => {
        const { ok, data } = await call(`/api/community/comments/${id}`, { method: "DELETE" });
        if (ok) {
            setComments((prev) => prev.filter((c) => c.id !== id));
            onChange(post.id, (p) => ({ ...p, comments: Math.max(0, p.comments - 1) }));
        } else {
            toast.error(data.message ?? t("error"));
        }
        setConfirmComment(null);
    };

    return (
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border">
            <div className="flex items-start justify-between px-4 pt-4 pb-2 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <Avatar src={post.author.avatar_url} name={name} size={40} />
                    <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{name}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-neutral-500">
                            <span>{ago(post.created_at, locale, t("justNow"))}</span>
                            <span>·</span>
                            <Globe className="w-3 h-3" />
                            <span>{t("public")}</span>
                        </div>
                    </div>
                </div>
                {post.mine && !confirming && (
                    <button onClick={() => setConfirming(true)} aria-label={t("delete")}
                        className="text-gray-400 dark:text-neutral-500 hover:text-red-500 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-dark-raised shrink-0">
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {confirming && (
                <div className="mx-4 mb-2 flex items-center justify-between gap-3 rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm">
                    <span className="text-red-700 dark:text-red-300">{t("confirmDelete")}</span>
                    <div className="flex gap-2 shrink-0">
                        <button onClick={remove} disabled={deleting}
                            className="bg-red-700 hover:bg-red-600 disabled:opacity-60 text-white text-xs font-semibold px-3 py-1 rounded-full">
                            {deleting ? t("deleting") : t("delete")}
                        </button>
                        <button onClick={() => setConfirming(false)} disabled={deleting}
                            className="text-xs font-semibold px-3 py-1 rounded-full border border-gray-300 dark:border-dark-border text-gray-600 dark:text-neutral-300">
                            {t("cancel")}
                        </button>
                    </div>
                </div>
            )}

            {post.body && (
                <div className="px-4 pb-3">
                    <Body text={post.body} />
                </div>
            )}

            {post.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.image_url} alt="" loading="lazy" className="w-full max-h-128 object-cover bg-gray-100 dark:bg-dark-raised" />
            )}

            <div className="px-4 py-2 flex items-center justify-between text-xs text-gray-500 dark:text-neutral-400 border-b border-gray-100 dark:border-dark-border">
                <div className="flex items-center gap-1">
                    <span className="w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-white text-[8px]">♥</span>
                    <span>{t("likes", { count: post.likes })}</span>
                </div>
                <button onClick={toggleComments} className="hover:underline">{t("comments", { count: post.comments })}</button>
            </div>

            <div className="px-2 py-1 flex items-center justify-around">
                <button onClick={like}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-colors ${post.liked ? "text-rose-500 bg-rose-50 dark:bg-rose-500/10" : "text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-dark-raised"}`}>
                    <Heart className={`w-4 h-4 ${post.liked ? "fill-rose-500 text-rose-500" : ""}`} />
                    {t("like")}
                </button>
                <button onClick={toggleComments}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-colors ${open ? "text-rose-500" : "text-gray-500 dark:text-neutral-400"} hover:bg-gray-100 dark:hover:bg-dark-raised`}>
                    <MessageCircle className="w-4 h-4" />
                    {t("comment")}
                </button>
            </div>

            {open && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-dark-border flex flex-col gap-3">
                    {user ? (
                        <div className="flex items-center gap-2">
                            <Avatar src={user.avatar_url} name={user.full_name || user.username || ""} size={32} />
                            <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={1000}
                                onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                                placeholder={t("writeComment")}
                                className="flex-1 bg-gray-100 dark:bg-dark-raised rounded-full px-4 py-2 text-sm text-gray-700 dark:text-neutral-200 placeholder-gray-400 dark:placeholder-neutral-500 outline-none focus:ring-2 focus:ring-rose-300" />
                            <button onClick={send} disabled={sending || !draft.trim()}
                                className="bg-red-700 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-full">
                                {sending ? t("sending") : t("send")}
                            </button>
                        </div>
                    ) : (
                        <button onClick={openSignIn} className="text-left text-sm text-gray-400 dark:text-neutral-500">{t("signInToComment")}</button>
                    )}

                    {loadingComments && !comments.length && <p className="text-xs text-gray-400 dark:text-neutral-500">{t("loading")}</p>}
                    {loadedOnce && !comments.length && <p className="text-xs text-gray-400 dark:text-neutral-500">{t("noComments")}</p>}

                    {comments.map((c) => (
                        <div key={c.id} className="flex items-start gap-2">
                            <Avatar src={c.author.avatar_url} name={c.author.name ?? t("reader")} size={32} />
                            <div className="min-w-0 flex-1">
                                <div className="bg-gray-100 dark:bg-dark-raised rounded-2xl px-3 py-2">
                                    <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{c.author.name ?? t("reader")}</p>
                                    <p className="text-sm text-gray-800 dark:text-neutral-100 whitespace-pre-wrap break-words">{c.body}</p>
                                </div>
                                <div className="flex items-center gap-3 mt-1 px-2 text-[11px] text-gray-400 dark:text-neutral-500">
                                    <span>{ago(c.created_at, locale, t("justNow"))}</span>
                                    {c.mine && confirmComment !== c.id && (
                                        <button onClick={() => setConfirmComment(c.id)} className="hover:text-red-500">{t("delete")}</button>
                                    )}
                                    {c.mine && confirmComment === c.id && (
                                        <>
                                            <span className="text-red-500">{t("confirmDeleteComment")}</span>
                                            <button onClick={() => removeComment(c.id)} className="text-red-500 font-semibold">{t("delete")}</button>
                                            <button onClick={() => setConfirmComment(null)}>{t("cancel")}</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {cursor && (
                        <button onClick={() => loadComments(true)} disabled={loadingComments}
                            className="self-start text-xs font-semibold text-rose-500 hover:underline disabled:opacity-60">
                            {loadingComments ? t("loading") : t("moreComments")}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

/* ------------------------------ The page ------------------------------ */

export default function CommunityComponent() {
    const t = useTranslations("Community");
    const user = useAuthStore((s) => s.user);
    const authLoading = useAuthStore((s) => s.loading);
    const openSignIn = useAuthModals((s) => s.openSignIn);
    const meId = user?.id ?? null;

    const [tab, setTab] = useState<Tab>("all");
    const [posts, setPosts] = useState<Post[]>([]);
    const [cursor, setCursor] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const moreBusy = useRef(false);
    const reqId = useRef(0);

    const [trending, setTrending] = useState<Trend[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const followBusy = useRef<Set<string>>(new Set());

    const loadFeed = useCallback(async () => {
        const id = ++reqId.current;
        setLoading(true);
        setFailed(false);
        const { ok, data } = await call<{ posts: Post[]; nextCursor: string | null }>(
            `/api/community/posts${tab === "following" ? "?following=1" : ""}`
        );
        if (id !== reqId.current) return;
        if (ok && data.posts) {
            setPosts(data.posts);
            setCursor(data.nextCursor ?? null);
        } else {
            setPosts([]);
            setCursor(null);
            setFailed(true);
        }
        setLoading(false);
    }, [tab]);

    const loadSidebar = useCallback(async () => {
        const { ok, data } = await call<{ trending: Trend[]; members: Member[] }>("/api/community/sidebar");
        if (ok) {
            setTrending(data.trending ?? []);
            setMembers(data.members ?? []);
        }
    }, []);

    // Wait until we know who is signed in, so likes show correctly
    useEffect(() => {
        if (authLoading) return;
        loadFeed();
    }, [authLoading, meId, loadFeed]);

    useEffect(() => {
        if (authLoading) return;
        loadSidebar();
    }, [authLoading, meId, loadSidebar]);

    useEffect(() => {
        if (!meId && tab === "following") setTab("all");
    }, [meId, tab]);

    const loadMore = async () => {
        if (moreBusy.current || !cursor) return;
        moreBusy.current = true;
        setLoadingMore(true);
        const { ok, data } = await call<{ posts: Post[]; nextCursor: string | null }>(
            `/api/community/posts?cursor=${cursor}${tab === "following" ? "&following=1" : ""}`
        );
        if (ok && data.posts) {
            setPosts((prev) => [...prev, ...data.posts!.filter((p) => !prev.some((x) => x.id === p.id))]);
            setCursor(data.nextCursor ?? null);
        } else {
            toast.error(data.message ?? t("error"));
        }
        moreBusy.current = false;
        setLoadingMore(false);
    };

    const change = (id: string, fn: (p: Post) => Post) => setPosts((prev) => prev.map((p) => (p.id === id ? fn(p) : p)));
    const remove = (id: string) => setPosts((prev) => prev.filter((p) => p.id !== id));
    const created = (post: Post) => {
        if (tab === "all") setPosts((prev) => [post, ...prev]);
        loadSidebar();
    };

    const follow = async (m: Member) => {
        if (!user) return openSignIn();
        if (followBusy.current.has(m.id)) return;
        followBusy.current.add(m.id);
        const { ok, data } = await call<{ following: boolean; followers: number }>("/api/community/follow", {
            method: "POST",
            headers: JSON_HEADERS,
            body: JSON.stringify({ userId: m.id }),
        });
        if (ok && typeof data.followers === "number") {
            setMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, following: !!data.following, followers: data.followers as number } : x)));
        } else {
            toast.error(data.message ?? t("error"));
        }
        followBusy.current.delete(m.id);
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-dark font-sans">
            <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Feed */}
                <div className="lg:col-span-2 flex flex-col gap-4 min-w-0">
                    <Composer onCreated={created} />

                    {user && (
                        <div className="flex gap-2">
                            {(["all", "following"] as Tab[]).map((k) => (
                                <button key={k} onClick={() => setTab(k)}
                                    className={`text-sm font-semibold px-4 py-1.5 rounded-full transition-colors ${tab === k ? "bg-red-700 text-white" : "bg-white dark:bg-dark-card text-gray-600 dark:text-neutral-300 border border-gray-200 dark:border-dark-border"}`}>
                                    {k === "all" ? t("tabAll") : t("tabFollowing")}
                                </button>
                            ))}
                        </div>
                    )}

                    {loading && (
                        <div className="flex flex-col gap-4">
                            {[0, 1].map((i) => (
                                <div key={i} className="h-40 rounded-xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border animate-pulse" />
                            ))}
                        </div>
                    )}

                    {!loading && failed && (
                        <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-6 text-center text-sm text-gray-500 dark:text-neutral-400">
                            <p className="mb-3">{t("loadFailed")}</p>
                            <button onClick={loadFeed} className="bg-red-700 hover:bg-red-600 text-white text-sm font-semibold px-5 py-1.5 rounded-full">{t("retry")}</button>
                        </div>
                    )}

                    {!loading && !failed && posts.length === 0 && (
                        <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-6 text-center text-sm text-gray-500 dark:text-neutral-400">
                            {tab === "following" ? t("emptyFollowing") : t("empty")}
                        </div>
                    )}

                    {!loading && posts.map((p) => <PostCard key={p.id} post={p} onChange={change} onRemove={remove} />)}

                    {!loading && cursor && (
                        <button onClick={loadMore} disabled={loadingMore}
                            className="self-center bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-sm font-semibold text-gray-700 dark:text-neutral-200 px-6 py-2 rounded-full disabled:opacity-60">
                            {loadingMore ? t("loading") : t("loadMore")}
                        </button>
                    )}
                </div>

                {/* Right Sidebar */}
                <div className="flex flex-col gap-4">
                    <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-4">
                        <div className="flex items-center gap-2 mb-4">
                            <h2 className="font-bold text-gray-900 dark:text-white text-sm">{t("trending")}</h2>
                            <Flame className="w-4 h-4 text-rose-500" />
                        </div>
                        {trending.length === 0 ? (
                            <p className="text-xs text-gray-400 dark:text-neutral-500">{t("noTrending")}</p>
                        ) : (
                            <ul className="flex flex-col gap-3">
                                {trending.map((topic) => (
                                    <li key={topic.tag} className="flex items-center justify-between gap-2">
                                        <span className="text-rose-500 text-sm font-semibold truncate">#{topic.tag}</span>
                                        <span className="text-xs text-gray-400 dark:text-neutral-500 shrink-0">{t("tagPosts", { count: topic.posts })}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {members.length > 0 && (
                        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-4">
                            <h2 className="font-bold text-gray-900 dark:text-white text-sm mb-4">{t("popularMembers")}</h2>
                            <ul className="flex flex-col gap-4">
                                {members.map((m) => (
                                    <li key={m.id} className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Avatar src={m.avatar_url} name={m.name ?? t("reader")} size={32} />
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-800 dark:text-neutral-100 leading-tight truncate">{m.name ?? t("reader")}</p>
                                                <p className="text-xs text-gray-400 dark:text-neutral-500">{t("followers", { count: m.followers })}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => follow(m)}
                                            className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors shrink-0 ${m.following ? "bg-rose-500 text-white border border-rose-500" : "border border-rose-400 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"}`}>
                                            {m.following ? t("following") : t("follow")}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}