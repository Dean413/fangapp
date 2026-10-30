"use client"
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, MoreVertical, Pencil } from "lucide-react";
import { toast } from "@/lib/store/toastStore";
import { formatDate, StarRating } from "@/components/reviews/stars";
import { ConfirmDialog, EditReviewDialog, sendJson } from "@/components/reviews/reviewsDialog";
import { useTranslations } from "next-intl";
import Footer from "@/components/footer";
import Imprint from "@/components/imprint";

const FALLBACK_COVER = "/fang_pictures/bookFace.png";

type MyReview = {
    id: string;
    rating: number;
    content: string;
    createdAt: string;
    likes: number;
    replies: number;
    hidden: boolean;
    book: { title: string; author: string; image: string | null; href: string; slug: string };
};

type MyComment = {
    id: string;
    content: string;
    createdAt: string;
    likes: number;
    replies: number;
    isReply: boolean;
    blocked: boolean;
    book: { title: string; image: string | null; chapter: number; href: string };
};

type Tab = "reviews" | "comments";

function Cover({ src, alt }: { src: string | null; alt: string }) {
    const [failed, setFailed] = useState(false);
    return (
        <div className="relative w-18 h-24 sm:w-24 sm:h-32 shrink-0 rounded-lg overflow-hidden bg-gray-200 dark:bg-neutral-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={!src || failed ? FALLBACK_COVER : src} alt={alt} onError={() => setFailed(true)} className="w-full h-full object-cover" />
            <Imprint size="sm" />
        </div>
    );
}

function Menu({ items }: { items: { label: string; onClick?: () => void; href?: string; danger?: boolean }[] }) {
    const [open, setOpen] = useState(false);
    const t = useTranslations("MyReviews");
    return (
        <div className="relative shrink-0">
            <button type="button" onClick={() => setOpen((o) => !o)} aria-label={t("options")}
                className="text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300">
                <MoreVertical className="w-5 h-5" />
            </button>
            {open && (
                <div onMouseLeave={() => setOpen(false)}
                    className="absolute right-0 mt-1 w-36 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-lg z-10 overflow-hidden">
                    {items.map((item) => item.href ? (
                        <Link key={item.label} href={item.href} className="block px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-dark-raised">{item.label}</Link>
                    ) : (
                        <button key={item.label} type="button" onClick={() => { setOpen(false); item.onClick?.(); }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-dark-raised ${item.danger ? "text-red-600" : ""}`}>
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function CardSkeleton() {
    return (
        <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-4 animate-pulse">
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-24 h-32 mx-auto sm:mx-0 rounded-lg bg-gray-200 dark:bg-dark-raised" />
                <div className="flex-1 space-y-2">
                    <div className="h-5 w-1/2 rounded bg-gray-200 dark:bg-dark-raised" />
                    <div className="h-3 w-1/4 rounded bg-gray-200 dark:bg-dark-raised" />
                    <div className="h-4 w-28 rounded bg-gray-200 dark:bg-dark-raised" />
                    <div className="h-3 w-full rounded bg-gray-200 dark:bg-dark-raised" />
                    <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-dark-raised" />
                </div>
            </div>
        </div>
    );
}

export default function MyReviews() {
    const t = useTranslations("MyReviews");
    const c = useTranslations("Common");
    const tr = useTranslations("Reviews");
    const tm = useTranslations("Comments");
    const [tab, setTab] = useState<Tab>("reviews");
    const [reviews, setReviews] = useState<MyReview[]>([]);
    const [comments, setComments] = useState<MyComment[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [failed, setFailed] = useState(false);
    const [editing, setEditing] = useState<MyReview | null>(null);
    const [deletingReview, setDeletingReview] = useState<MyReview | null>(null);
    const [deletingComment, setDeletingComment] = useState<MyComment | null>(null);
    const requestId = useRef(0);
    const moreBusy = useRef(false);

    const url = (t: Tab, before?: string) =>
        `${t === "reviews" ? "/api/reviews/mine" : "/api/comments/mine"}${before ? `?before=${before}` : ""}`;

    const load = useCallback(async (t: Tab) => {
        const id = ++requestId.current;
        setLoading(true);
        setFailed(false);
        try {
            const res = await fetch(url(t), { credentials: "include", cache: "no-store" });
            const data = await res.json().catch(() => ({}));
            if (id !== requestId.current) return;
            if (!res.ok) { setFailed(true); return; }
            if (t === "reviews") setReviews(data.reviews ?? []);
            else setComments(data.comments ?? []);
            setHasMore(Boolean(data.hasMore));
        } catch {
            if (id === requestId.current) setFailed(true);
        } finally {
            if (id === requestId.current) setLoading(false);
        }
    }, []);

    useEffect(() => { load(tab); }, [tab, load]);

    const loadMore = async () => {
        if (moreBusy.current) return;
        const list = tab === "reviews" ? reviews : comments;
        const last = list[list.length - 1]?.id;
        if (!last) return;
        moreBusy.current = true;
        setLoadingMore(true);
        const id = requestId.current;
        try {
            const res = await fetch(url(tab, last), { credentials: "include", cache: "no-store" });
            const data = await res.json().catch(() => ({}));
            if (id !== requestId.current) return;
            if (!res.ok) return void toast.error(data.message || t("couldntLoadMore"));
            if (tab === "reviews") setReviews((prev) => [...prev, ...(data.reviews ?? []).filter((r: MyReview) => !prev.some((p) => p.id === r.id))]);
            else setComments((prev) => [...prev, ...(data.comments ?? []).filter((c: MyComment) => !prev.some((p) => p.id === c.id))]);
            setHasMore(Boolean(data.hasMore));
        } catch {
            toast.error(c("networkError"));
        } finally {
            moreBusy.current = false;
            setLoadingMore(false);
        }
    };

    const tabClass = (on: boolean) => on
        ? "flex-1 sm:flex-none px-4 sm:px-5 py-2 rounded-full bg-red-500 text-white text-sm font-medium"
        : "flex-1 sm:flex-none px-4 sm:px-5 py-2 rounded-full bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-sm font-medium text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-dark-raised";

    const empty = tab === "reviews" ? reviews.length === 0 : comments.length === 0;

    return (
        <>
            <div className="min-h-screen bg-gray-50 dark:bg-dark p-4 sm:p-6">
                <div className="max-w-6xl mx-auto">

                    {/* Header */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {t("title")}
                        </h1>

                        <div className="flex gap-2">
                            <button type="button" onClick={() => setTab("reviews")} className={tabClass(tab === "reviews")}>
                                {t("reviews")}
                            </button>

                            <button type="button" onClick={() => setTab("comments")} className={tabClass(tab === "comments")}>
                                {t("comments")}
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="space-y-4">{[0, 1, 2].map((i) => <CardSkeleton key={i} />)}</div>
                    ) : failed ? (
                        <div className="text-center py-16">
                            <p className="text-gray-500 dark:text-neutral-400 mb-4">{t(tab === "reviews" ? "loadReviewsFailed" : "loadCommentsFailed")}</p>
                            <button type="button" onClick={() => load(tab)} className="border border-red-500 text-red-500 px-4 py-2 rounded-full">{c("retry")}</button>
                        </div>
                    ) : empty ? (
                        <div className="text-center py-16">
                            <p className="text-gray-500 dark:text-neutral-400 mb-4">
                                {tab === "reviews" ? t("noReviews") : t("noComments")}
                            </p>
                            <Link href="/genre" className="inline-block bg-red-500 text-white px-5 py-2 rounded-full text-sm font-medium">{t("findBook")}</Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {tab === "reviews" ? reviews.map((r) => (
                                <div key={r.id} className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-4">
                                    <div className="grid grid-cols-[auto_1fr] gap-x-4">

                                        {/* Book cover */}
                                        <Link href={r.book.href} className="row-span-1 sm:row-span-2"><Cover src={r.book.image} alt={r.book.title} /></Link>

                                        {/* Title, author, rating, menu */}
                                        <div className="min-w-0">
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="min-w-0">
                                                    <Link href={r.book.href} className="font-serif text-xl sm:text-lg font-bold text-gray-900 dark:text-white line-clamp-2 hover:text-red-600">
                                                        {r.book.title}
                                                    </Link>
                                                    <p className="mt-0.5 text-sm text-gray-500 dark:text-neutral-400 truncate">
                                                        {t("byAuthor", { author: r.book.author })}
                                                    </p>
                                                </div>

                                                <Menu items={[
                                                    { label: t("edit"), onClick: () => setEditing(r) },
                                                    { label: t("viewBook"), href: `${r.book.href}#reviews` },
                                                    { label: c("delete"), onClick: () => setDeletingReview(r), danger: true },
                                                ]} />
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                                <StarRating rating={r.rating} />
                                                <span className="text-sm font-semibold text-gray-700 dark:text-neutral-200">{r.rating}/5</span>
                                                {r.hidden && <span className="text-xs text-red-500">{t("hiddenByModerators")}</span>}
                                            </div>
                                        </div>

                                        {/* Review, date and footer: full width on phones, beside the cover on desktop */}
                                        <div className="col-span-2 sm:col-span-1 sm:col-start-2 mt-4 sm:mt-2 min-w-0">
                                            <p className="text-base sm:text-sm text-gray-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line wrap-break-word">
                                                &quot;{r.content}&quot;
                                            </p>

                                            <p className="mt-4 text-sm sm:text-xs text-gray-400 dark:text-neutral-500">
                                                {t("postedOn", { date: formatDate(r.createdAt) })}
                                            </p>

                                            <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-4 text-sm text-gray-500 dark:border-dark-border dark:text-neutral-400">
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                                    <span className="flex items-center gap-1.5">
                                                        <Heart className="w-4 h-4 text-red-500" />
                                                        {t("likesCount", { count: r.likes })}
                                                    </span>
                                                    <Link href={`${r.book.href}#reviews`} className="flex items-center gap-1.5 hover:text-red-500">
                                                        <MessageCircle className="w-4 h-4" />
                                                        {t("commentsCount", { count: r.replies })}
                                                    </Link>
                                                </div>

                                                <button type="button" onClick={() => setEditing(r)} className="flex shrink-0 items-center gap-1 font-semibold text-red-600 hover:text-red-700">
                                                    <Pencil className="w-4 h-4" />
                                                    {t("edit")}
                                                </button>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            )) : comments.map((c) => (
                                <div key={c.id} className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-4">
                                    <div className="grid grid-cols-[auto_1fr] gap-x-4">

                                        <Link href={c.book.href} className="row-span-1 sm:row-span-2"><Cover src={c.book.image} alt={c.book.title} /></Link>

                                        <div className="min-w-0">
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="min-w-0">
                                                    <Link href={c.book.href} className="font-serif text-xl sm:text-lg font-bold text-gray-900 dark:text-white line-clamp-2 hover:text-red-600">
                                                        {c.book.title}
                                                    </Link>
                                                    <p className="mt-0.5 text-sm text-gray-500 dark:text-neutral-400">
                                                        {c.isReply ? t("chapterReply", { chapter: c.book.chapter }) : t("chapterN", { chapter: c.book.chapter })}
                                                    </p>
                                                </div>

                                                <Menu items={[
                                                    { label: t("viewChapter"), href: c.book.href },
                                                    { label: t("delete"), onClick: () => setDeletingComment(c), danger: true },
                                                ]} />
                                            </div>

                                            {c.blocked && <p className="mt-2 text-xs text-red-500">{t("hiddenByWriter")}</p>}
                                        </div>

                                        <div className="col-span-2 sm:col-span-1 sm:col-start-2 mt-4 sm:mt-2 min-w-0">
                                            <p className="text-base sm:text-sm text-gray-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line wrap-break-word">
                                                &quot;{c.content}&quot;
                                            </p>

                                            <p className="mt-4 text-sm sm:text-xs text-gray-400 dark:text-neutral-500">
                                                {t("postedOn", { date: formatDate(c.createdAt) })}
                                            </p>

                                            <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-4 text-sm text-gray-500 dark:border-dark-border dark:text-neutral-400">
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                                    <span className="flex items-center gap-1.5">
                                                        <Heart className="w-4 h-4 text-red-500" />
                                                        {t("likesCount", { count: c.likes })}
                                                    </span>
                                                    <span className="flex items-center gap-1.5">
                                                        <MessageCircle className="w-4 h-4" />
                                                        {t("commentsCount", { count: c.replies })}
                                                    </span>
                                                </div>

                                                <Link href={c.book.href} className="shrink-0 font-semibold text-red-600 hover:text-red-700">
                                                    {t("view")}
                                                </Link>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            ))}

                            {hasMore && (
                                <div className="flex justify-center pt-2">
                                    <button type="button" onClick={loadMore} disabled={loadingMore}
                                        className="rounded-full border border-gray-200 dark:border-dark-border px-5 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-card disabled:opacity-60">
                                        {loadingMore ? c("loading") : t("showMore")}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {editing && (
                    <EditReviewDialog open onClose={() => setEditing(null)} book={editing.book.slug} title={editing.book.title}
                        rating={editing.rating} content={editing.content}
                        onSaved={(saved) => setReviews((prev) => prev.map((r) => (r.id === editing.id ? { ...r, rating: saved.rating, content: saved.content } : r)))} />
                )}

                <ConfirmDialog open={Boolean(deletingReview)} onClose={() => setDeletingReview(null)} title={tr("deleteReviewTitle")}
                    text={tr("deleteReviewText")}
                    onConfirm={async () => {
                        if (!deletingReview) return true;
                        const { ok, data } = await sendJson(`/api/reviews/${deletingReview.id}`, "DELETE");
                        if (!ok) { toast.error(data.message || tr("couldntDelete")); return false; }
                        setReviews((prev) => prev.filter((r) => r.id !== deletingReview.id));
                        toast.success(tr("deleted"));
                        return true;
                    }} />

                <ConfirmDialog open={Boolean(deletingComment)} onClose={() => setDeletingComment(null)} title={tm("deleteTitle")}
                    text={tm("deleteText")}
                    onConfirm={async () => {
                        if (!deletingComment) return true;
                        const { ok, data } = await sendJson(`/api/comments/${deletingComment.id}`, "DELETE");
                        if (!ok) { toast.error(data.message || tm("couldntDelete")); return false; }
                        setComments((prev) => prev.filter((c) => c.id !== deletingComment.id));
                        toast.success(tm("deleted"));
                        return true;
                    }} />


            </div>

        </>
    );
}