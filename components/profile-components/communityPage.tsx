"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/lib/store/authStore";
import { useAuthModals } from "@/lib/store/auth-card-store";
import { toast } from "@/lib/store/toastStore";
import Composer from "@/components/profile-components/community/composer";
import PostCard from "@/components/profile-components/community/postCard";
import { AuthorsCard, TrendingCard } from "@/components/profile-components/community/sideBar";
import { useMyVip } from "@/lib/communityPage/useMyVip";
import { call } from "@/lib/communityPage/api";
import type { Member, Post, Tab, Trend } from "@/lib/communityPage/types";

export default function CommunityComponent() {
    const t = useTranslations("Community");
    const a = useTranslations("Author");
    const user = useAuthStore((s) => s.user);
    const authLoading = useAuthStore((s) => s.loading);
    const openSignIn = useAuthModals((s) => s.openSignIn);
    const meId = user?.id ?? null;
    const myVip = useMyVip();

    const [tab, setTab] = useState<Tab>("all");
    const [tag, setTag] = useState<string | null>(null);
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

    const feedQuery = useCallback(
        (cursorValue?: string | null) => {
            const qs = new URLSearchParams();
            if (cursorValue) qs.set("cursor", cursorValue);
            if (tab === "following") qs.set("following", "1");
            if (tag) qs.set("tag", tag);
            const s = qs.toString();
            return `/api/community/posts${s ? `?${s}` : ""}`;
        },
        [tab, tag]
    );

    const loadFeed = useCallback(async () => {
        const id = ++reqId.current;
        setLoading(true);
        setFailed(false);
        const { ok, data } = await call<{ posts: Post[]; nextCursor: string | null }>(feedQuery());
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
    }, [feedQuery]);

    const loadSidebar = useCallback(async () => {
        const { ok, data } = await call<{ trending: Trend[]; members: Member[] }>("/api/community/sidebar");
        if (ok) {
            setTrending(data.trending ?? []);
            setMembers(data.members ?? []);
        }
    }, []);

    // Wait until we know who is signed in, so likes and votes show correctly
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
        const { ok, data } = await call<{ posts: Post[]; nextCursor: string | null }>(feedQuery(cursor));
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
        if (tab === "all" && !tag) setPosts((prev) => [post, ...prev]);
        loadSidebar();
    };

    const pickTag = (picked: string) => {
        setTag(tag === picked ? null : picked);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // Only authors can be followed (uses the author follow route)
    const follow = async (m: Member) => {
        if (!user) return openSignIn();
        if (followBusy.current.has(m.id)) return;
        followBusy.current.add(m.id);
        const { ok, data } = await call<{ following: boolean; followers: number }>(`/api/authors/${m.slug}/follow`, {
            method: m.following ? "DELETE" : "POST",
        });
        if (ok && typeof data.followers === "number") {
            setMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, following: !!data.following, followers: data.followers as number } : x)));
        } else {
            toast.error(a("followFailed"));
        }
        followBusy.current.delete(m.id);
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-dark font-sans">
            <div className="max-w-6xl mx-auto px-2 sm:px-4 py-6 grid grid-cols-[minmax(0,1fr)] lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Main Feed */}
                <div className="lg:col-span-2 flex flex-col gap-4 min-w-0">
                    <Composer onCreated={created} vip={myVip} />

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

                    {tag && (
                        <div className="flex">
                            <button onClick={() => setTag(null)} aria-label={t("clearTag")}
                                className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-300 text-sm font-semibold px-3 py-1.5 rounded-full">
                                #{tag}
                                <X className="w-3.5 h-3.5" />
                            </button>
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
                            {tag ? t("emptyTag") : tab === "following" ? t("emptyFollowing") : t("empty")}
                        </div>
                    )}

                    {!loading && posts.map((p) => <PostCard key={p.id} post={p} onChange={change} onRemove={remove} myVip={myVip} />)}

                    {!loading && cursor && (
                        <button onClick={loadMore} disabled={loadingMore}
                            className="self-center bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-sm font-semibold text-gray-700 dark:text-neutral-200 px-6 py-2 rounded-full disabled:opacity-60">
                            {loadingMore ? t("loading") : t("loadMore")}
                        </button>
                    )}
                </div>

                {/* Right Sidebar */}
                <div className="flex flex-col gap-4">
                    <TrendingCard trending={trending} active={tag} onPick={pickTag} />
                    <AuthorsCard members={members} onFollow={follow} />
                </div>
            </div>
        </div>
    );
}