"use client"
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, MoreVertical, Pencil } from "lucide-react";
import { toast } from "react-toastify";
import { formatDate, StarRating } from "@/components/reviews/stars";
import { ConfirmDialog, EditReviewDialog, sendJson } from "@/components/reviews/reviewsDialog";

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
        <div className="w-24 h-32 mx-auto sm:mx-0 shrink-0 rounded-lg overflow-hidden bg-gray-200 dark:bg-neutral-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={!src || failed ? FALLBACK_COVER : src} alt={alt} onError={() => setFailed(true)} className="w-full h-full object-cover" />
        </div>
    );
}

function Menu({ items }: { items: { label: string; onClick?: () => void; href?: string; danger?: boolean }[] }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative shrink-0">
            <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Options"
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
            if (!res.ok) return void toast.error(data.message || "Couldn't load more");
            if (tab === "reviews") setReviews((prev) => [...prev, ...(data.reviews ?? []).filter((r: MyReview) => !prev.some((p) => p.id === r.id))]);
            else setComments((prev) => [...prev, ...(data.comments ?? []).filter((c: MyComment) => !prev.some((p) => p.id === c.id))]);
            setHasMore(Boolean(data.hasMore));
        } catch {
            toast.error("Unable to reach the server. Please try again.");
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
        <div className="min-h-screen bg-gray-50 dark:bg-dark p-4 sm:p-6">
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                        My Reviews
                    </h1>

                    <div className="flex gap-2">
                        <button type="button" onClick={() => setTab("reviews")} className={tabClass(tab === "reviews")}>
                            Reviews
                        </button>

                        <button type="button" onClick={() => setTab("comments")} className={tabClass(tab === "comments")}>
                            Comments
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-4">{[0, 1, 2].map((i) => <CardSkeleton key={i} />)}</div>
                ) : failed ? (
                    <div className="text-center py-16">
                        <p className="text-gray-500 dark:text-neutral-400 mb-4">Couldn&apos;t load your {tab}.</p>
                        <button type="button" onClick={() => load(tab)} className="border border-red-500 text-red-500 px-4 py-2 rounded-full">Try again</button>
                    </div>
                ) : empty ? (
                    <div className="text-center py-16">
                        <p className="text-gray-500 dark:text-neutral-400 mb-4">
                            {tab === "reviews" ? "You haven't reviewed any books yet." : "You haven't commented on any chapters yet."}
                        </p>
                        <Link href="/stories" className="inline-block bg-red-500 text-white px-5 py-2 rounded-full text-sm font-medium">Find a book</Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {tab === "reviews" ? reviews.map((r) => (
                            <div key={r.id} className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-4">
                                <div className="flex flex-col sm:flex-row gap-4">

                                    {/* Book Cover */}
                                    <Link href={r.book.href}><Cover src={r.book.image} alt={r.book.title} /></Link>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">

                                        {/* Top */}
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="min-w-0">
                                                <Link href={r.book.href} className="text-base sm:text-lg font-bold text-gray-900 dark:text-white line-clamp-2 hover:text-red-600">
                                                    {r.book.title}
                                                </Link>

                                                <p className="text-sm text-gray-500 dark:text-neutral-400">
                                                    by {r.book.author}
                                                </p>
                                            </div>

                                            <Menu items={[
                                                { label: "Edit", onClick: () => setEditing(r) },
                                                { label: "View book", href: `${r.book.href}#reviews` },
                                                { label: "Delete", onClick: () => setDeletingReview(r), danger: true },
                                            ]} />
                                        </div>

                                        {/* Rating */}
                                        <div className="flex flex-wrap items-center gap-2 mt-2">
                                            <StarRating rating={r.rating} />

                                            <span className="text-sm font-semibold text-gray-700 dark:text-neutral-200">
                                                {r.rating}/5
                                            </span>
                                            {r.hidden && <span className="text-xs text-red-500">Hidden by moderators</span>}
                                        </div>

                                        {/* Review */}
                                        <p className="text-sm text-gray-600 dark:text-neutral-300 mt-2 leading-relaxed whitespace-pre-line wrap-break-word">
                                            &quot;{r.content}&quot;
                                        </p>

                                        {/* Footer */}
                                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                                            <span className="text-xs text-gray-400 dark:text-neutral-500">
                                                Posted on {formatDate(r.createdAt)}
                                            </span>

                                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-neutral-400">

                                                <span className="flex items-center gap-1">
                                                    <Heart className="w-4 h-4 text-red-400" />
                                                    {r.likes}
                                                </span>

                                                <Link href={`${r.book.href}#reviews`} className="flex items-center gap-1 hover:text-red-500">
                                                    <MessageCircle className="w-4 h-4" />
                                                    {r.replies}
                                                </Link>

                                                <button type="button" onClick={() => setEditing(r)} className="flex items-center gap-1 text-red-500 font-medium hover:text-red-600">
                                                    <Pencil className="w-4 h-4" />
                                                    Edit
                                                </button>

                                            </div>

                                        </div>

                                    </div>

                                </div>
                            </div>
                        )) : comments.map((c) => (
                            <div key={c.id} className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-4">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <Link href={c.book.href}><Cover src={c.book.image} alt={c.book.title} /></Link>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="min-w-0">
                                                <Link href={c.book.href} className="text-base sm:text-lg font-bold text-gray-900 dark:text-white line-clamp-2 hover:text-red-600">
                                                    {c.book.title}
                                                </Link>
                                                <p className="text-sm text-gray-500 dark:text-neutral-400">
                                                    Chapter {c.book.chapter}{c.isReply && " · Reply"}
                                                </p>
                                            </div>

                                            <Menu items={[
                                                { label: "View chapter", href: c.book.href },
                                                { label: "Delete", onClick: () => setDeletingComment(c), danger: true },
                                            ]} />
                                        </div>

                                        {c.blocked && <p className="mt-2 text-xs text-red-500">Hidden by the writer</p>}

                                        <p className="text-sm text-gray-600 dark:text-neutral-300 mt-2 leading-relaxed whitespace-pre-line wrap-break-word">
                                            &quot;{c.content}&quot;
                                        </p>

                                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <span className="text-xs text-gray-400 dark:text-neutral-500">
                                                Posted on {formatDate(c.createdAt)}
                                            </span>

                                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-neutral-400">
                                                <span className="flex items-center gap-1">
                                                    <Heart className="w-4 h-4 text-red-400" />
                                                    {c.likes}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MessageCircle className="w-4 h-4" />
                                                    {c.replies}
                                                </span>
                                                <Link href={c.book.href} className="text-red-500 font-medium hover:text-red-600">
                                                    View
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {hasMore && (
                            <div className="flex justify-center pt-2">
                                <button type="button" onClick={loadMore} disabled={loadingMore}
                                    className="rounded-full border border-gray-200 dark:border-dark-border px-5 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-card disabled:opacity-60">
                                    {loadingMore ? "Loading..." : "Show more"}
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

            <ConfirmDialog open={Boolean(deletingReview)} onClose={() => setDeletingReview(null)} title="Delete review"
                text="Your rating and review of this book will be removed."
                onConfirm={async () => {
                    if (!deletingReview) return true;
                    const { ok, data } = await sendJson(`/api/reviews/${deletingReview.id}`, "DELETE");
                    if (!ok) { toast.error(data.message || "Couldn't delete your review"); return false; }
                    setReviews((prev) => prev.filter((r) => r.id !== deletingReview.id));
                    toast.success("Review deleted");
                    return true;
                }} />

            <ConfirmDialog open={Boolean(deletingComment)} onClose={() => setDeletingComment(null)} title="Delete comment"
                text="This comment and its replies will be removed for everyone."
                onConfirm={async () => {
                    if (!deletingComment) return true;
                    const { ok, data } = await sendJson(`/api/comments/${deletingComment.id}`, "DELETE");
                    if (!ok) { toast.error(data.message || "Couldn't delete your comment"); return false; }
                    setComments((prev) => prev.filter((c) => c.id !== deletingComment.id));
                    toast.success("Comment deleted");
                    return true;
                }} />
        </div>
    );
}