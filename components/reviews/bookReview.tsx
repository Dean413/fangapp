"use client";

// The "Reader Reviews" section of a book page: write / edit your review, the reviews (newest first),
// likes, replies and reports.
import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquareText, MoreVertical, ShieldAlert, ThumbsUp } from "lucide-react";
import { toast } from "react-toastify";
import { useAuthStore } from "@/lib/store/authStore";
import { useAuthModals } from "@/lib/store/auth-card-store";
import { Avatar, formatDateTime, StarRating } from "./stars";
import { ConfirmDialog, ReportDialog, ReviewForm, sendJson, useBusy, type ReportTarget } from "./reviewsDialog";

type Person = { name: string; avatar: string | null; publicId: string | null; status: string };

export type Review = {
    id: string;
    rating: number;
    content: string;
    afterCompletion: boolean;
    createdAt: string;
    updatedAt: string;
    edited: boolean;
    likes: number;
    replies: number;
    liked: boolean;
    mine: boolean;
    author: Person;
};

type Reply = { id: string; content: string; createdAt: string; mine: boolean; author: Person };
type Eligibility = { signedIn: boolean; canReview: boolean; read: number; needed: number; ownBook: boolean };
export type ReviewSummary = { average: number | null; count: number };

const MAX_REPLY = 1000;

// ---------- One review's replies ----------

function Replies({ review, onCount, onReport }: {
    review: Review;
    onCount: (n: number) => void;
    onReport: (t: ReportTarget) => void;
}) {
    const signedIn = useAuthStore((s) => Boolean(s.user));
    const openSignIn = useAuthModals((s) => s.openSignIn);
    const [replies, setReplies] = useState<Reply[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [text, setText] = useState("");
    const [deleting, setDeleting] = useState<Reply | null>(null);
    const post = useBusy();
    const more = useBusy();

    const load = useCallback(async (after?: string) => {
        const url = `/api/reviews/${review.id}/replies${after ? `?after=${after}` : ""}`;
        const res = await fetch(url, { credentials: "include", cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message);
        return data as { replies: Reply[]; hasMore: boolean };
    }, [review.id]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setFailed(false);
        load()
            .then((d) => { if (!cancelled) { setReplies(d.replies); setHasMore(d.hasMore); } })
            .catch(() => { if (!cancelled) setFailed(true); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [load]);

    const loadMore = () => more.run(async () => {
        const last = replies[replies.length - 1]?.id;
        const d = await load(last);
        setReplies((prev) => [...prev, ...d.replies.filter((r) => !prev.some((p) => p.id === r.id))]);
        setHasMore(d.hasMore);
    });

    const send = () => post.run(async () => {
        if (!text.trim()) return;
        const { ok, data } = await sendJson(`/api/reviews/${review.id}/replies`, "POST", { content: text });
        if (!ok) return void toast.error(data.message || "Couldn't post your reply");
        setReplies((prev) => [...prev, data.reply]);
        setText("");
        onCount(review.replies + 1);
    });

    return (
        <div className="mt-4 ml-2 sm:ml-4 pl-3 sm:pl-4 border-l-2 border-gray-200 dark:border-dark-border space-y-4">
            {loading ? (
                <div className="space-y-3">
                    {[0, 1].map((i) => <div key={i} className="h-12 rounded-lg animate-pulse bg-gray-100 dark:bg-dark-raised" />)}
                </div>
            ) : failed ? (
                <p className="text-sm text-gray-500 dark:text-neutral-400">Couldn&apos;t load the replies.</p>
            ) : (
                <>
                    {replies.length === 0 && <p className="text-sm text-gray-500 dark:text-neutral-400">No replies yet.</p>}
                    {replies.map((r) => (
                        <div key={r.id} className="flex gap-3">
                            <Avatar src={r.author.avatar} name={r.author.name} size={32} />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{r.author.name}</p>
                                <p className="mt-0.5 text-sm text-gray-700 dark:text-neutral-300 whitespace-pre-line wrap-break-word">{r.content}</p>
                                <div className="mt-1 flex items-center gap-4 text-xs text-gray-400 dark:text-neutral-500">
                                    <span>{formatDateTime(r.createdAt)}</span>
                                    {r.mine ? (
                                        <button type="button" onClick={() => setDeleting(r)} className="hover:text-red-500">Delete</button>
                                    ) : signedIn && (
                                        <button type="button" className="hover:text-red-500"
                                            onClick={() => onReport({ type: "review_reply", id: r.id, name: r.author.name, avatar: r.author.avatar, publicId: r.author.publicId, status: r.author.status, content: r.content })}>
                                            Report
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {hasMore && (
                        <button type="button" onClick={loadMore} disabled={more.busy} className="text-sm text-red-600 font-medium">
                            {more.busy ? "Loading..." : "Show more replies"}
                        </button>
                    )}
                </>
            )}

            {signedIn ? (
                <div className="flex gap-2 items-start">
                    <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, MAX_REPLY))} disabled={post.busy}
                        placeholder="Write a reply..."
                        className="flex-1 min-h-11 max-h-32 resize-y rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-dark px-3 py-2 text-sm outline-none focus:border-black dark:focus:border-white" />
                    <button type="button" onClick={send} disabled={post.busy || !text.trim()}
                        className="px-4 py-2 rounded-lg bg-red-800 text-white text-sm disabled:opacity-50">
                        {post.busy ? "..." : "Reply"}
                    </button>
                </div>
            ) : (
                <button type="button" onClick={openSignIn} className="text-sm text-red-600 font-medium">Sign in to reply</button>
            )}

            <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Delete reply"
                text="This reply will be removed for everyone."
                onConfirm={async () => {
                    if (!deleting) return true;
                    const { ok, data } = await sendJson(`/api/review-replies/${deleting.id}`, "DELETE");
                    if (!ok) { toast.error(data.message || "Couldn't delete your reply"); return false; }
                    setReplies((prev) => prev.filter((r) => r.id !== deleting.id));
                    onCount(Math.max(0, review.replies - 1));
                    toast.success("Reply deleted");
                    return true;
                }} />
        </div>
    );
}

// ---------- One review ----------

function ReviewItem({ review, onChange, onReport, onEdit, onDelete }: {
    review: Review;
    onChange: (r: Review) => void;
    onReport: (t: ReportTarget) => void;
    onEdit?: () => void;
    onDelete?: () => void;
}) {
    const signedIn = useAuthStore((s) => Boolean(s.user));
    const openSignIn = useAuthModals((s) => s.openSignIn);
    const [showReplies, setShowReplies] = useState(false);
    const [menu, setMenu] = useState(false);
    const likeBusy = useRef(false);

    const toggleLike = async () => {
        if (!signedIn) return openSignIn();
        if (review.mine || likeBusy.current) return;
        likeBusy.current = true;
        const like = !review.liked;
        onChange({ ...review, liked: like, likes: review.likes + (like ? 1 : -1) });
        try {
            const { ok, data } = await sendJson(`/api/reviews/${review.id}/like`, "POST", { like });
            if (ok) onChange({ ...review, liked: data.liked, likes: data.likes });
            else {
                onChange(review);
                toast.error(data.message || "Couldn't update the like");
            }
        } catch {
            onChange(review);
            toast.error("Unable to reach the server. Please try again.");
        } finally {
            likeBusy.current = false;
        }
    };

    return (
        <div className="py-5 border-b border-dashed border-gray-200 dark:border-dark-border">
            <div className="flex gap-3 sm:gap-5">
                <Avatar src={review.author.avatar} name={review.author.name} size={56} />
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                                {review.author.name}
                                {review.mine && <span className="ml-2 text-[10px] font-semibold text-red-600 uppercase">You</span>}
                            </p>
                            <div className="mt-1"><StarRating rating={review.rating} size="sm" /></div>
                            {review.afterCompletion && (
                                <p className="mt-1 text-[11px] text-gray-600 dark:text-neutral-400">Review after the novel completion</p>
                            )}
                        </div>
                        {review.mine && (onEdit || onDelete) && (
                            <div className="relative shrink-0">
                                <button type="button" onClick={() => setMenu((m) => !m)} aria-label="Review options"
                                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300">
                                    <MoreVertical className="w-5 h-5" />
                                </button>
                                {menu && (
                                    <div className="absolute right-0 mt-1 w-32 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-lg z-10 overflow-hidden"
                                        onMouseLeave={() => setMenu(false)}>
                                        {onEdit && <button type="button" onClick={() => { setMenu(false); onEdit(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-dark-raised">Edit</button>}
                                        {onDelete && <button type="button" onClick={() => { setMenu(false); onDelete(); }} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-50 dark:hover:bg-dark-raised">Delete</button>}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-gray-700 dark:text-neutral-300 whitespace-pre-line wrap-break-word">{review.content}</p>

                    <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="text-xs sm:text-sm text-gray-500 dark:text-neutral-400">
                            {formatDateTime(review.createdAt)}{review.edited && " · edited"}
                        </span>
                        <div className="flex items-center gap-4 text-gray-600 dark:text-neutral-300">
                            <button type="button" onClick={toggleLike} disabled={review.mine} aria-label="Like"
                                className={`flex items-center gap-1 text-sm ${review.liked ? "text-red-600" : ""} disabled:cursor-default`}>
                                <ThumbsUp className={`w-5 h-5 ${review.liked ? "fill-red-600" : ""}`} />
                                {review.likes > 0 && <span>{review.likes}</span>}
                            </button>
                            <button type="button" onClick={() => setShowReplies((s) => !s)} aria-label="Replies"
                                className={`flex items-center gap-1 text-sm ${showReplies ? "text-red-600" : ""}`}>
                                <MessageSquareText className="w-5 h-5" />
                                {review.replies > 0 && <span>{review.replies}</span>}
                            </button>
                            {!review.mine && (
                                <button type="button" aria-label="Report"
                                    onClick={() => signedIn
                                        ? onReport({ type: "review", id: review.id, name: review.author.name, avatar: review.author.avatar, publicId: review.author.publicId, status: review.author.status, content: review.content })
                                        : openSignIn()}>
                                    <ShieldAlert className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {showReplies && (
                        <Replies review={review} onReport={onReport} onCount={(n) => onChange({ ...review, replies: n })} />
                    )}
                </div>
            </div>
        </div>
    );
}

// ---------- The section ----------

export default function BookReviews({ bookId, onSummary }: { bookId: string; onSummary?: (s: ReviewSummary) => void }) {
    const userId = useAuthStore((s) => s.user?.id ?? null);
    const openSignIn = useAuthModals((s) => s.openSignIn);

    const [reviews, setReviews] = useState<Review[]>([]);
    const [mine, setMine] = useState<Review | null>(null);
    const [summary, setSummary] = useState<ReviewSummary>({ average: null, count: 0 });
    const [eligibility, setEligibility] = useState<Eligibility | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [editing, setEditing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [report, setReport] = useState<ReportTarget | null>(null);
    const more = useBusy();
    const requestId = useRef(0);

    const applySummary = useCallback((s: ReviewSummary) => {
        setSummary(s);
        onSummary?.(s);
    }, [onSummary]);

    const load = useCallback(async () => {
        if (!bookId) return;
        const id = ++requestId.current;
        setLoading(true);
        setFailed(false);
        try {
            const res = await fetch(`/api/reviews?book=${encodeURIComponent(bookId)}`, { credentials: "include", cache: "no-store" });
            const data = await res.json().catch(() => ({}));
            if (id !== requestId.current) return;
            if (!res.ok) { setFailed(true); return; }
            setReviews(data.reviews ?? []);
            setHasMore(Boolean(data.hasMore));
            setMine(data.mine ?? null);
            setEligibility(data.eligibility ?? null);
            applySummary(data.summary ?? { average: null, count: 0 });
        } catch {
            if (id === requestId.current) setFailed(true);
        } finally {
            if (id === requestId.current) setLoading(false);
        }
    }, [bookId, applySummary]);

    // Reload when the book or the signed-in account changes
    useEffect(() => { load(); }, [load, userId]);

    const loadMore = () => more.run(async () => {
        const last = reviews[reviews.length - 1]?.id;
        if (!last) return;
        const res = await fetch(`/api/reviews?book=${encodeURIComponent(bookId)}&before=${last}`, { credentials: "include", cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return void toast.error(data.message || "Couldn't load more reviews");
        setReviews((prev) => [...prev, ...(data.reviews ?? []).filter((r: Review) => !prev.some((p) => p.id === r.id))]);
        setHasMore(Boolean(data.hasMore));
    });

    const saveReview = async (rating: number, content: string) => {
        const { ok, data } = await sendJson("/api/reviews", "POST", { book: bookId, rating, content });
        if (!ok) {
            toast.error(data.message || "Couldn't save your review");
            return false;
        }
        toast.success(data.message || "Review saved");
        const saved: Review = data.review;
        setMine(saved);
        setReviews((prev) => [saved, ...prev.filter((r) => r.id !== saved.id)]);
        if (data.summary) applySummary(data.summary);
        setEditing(false);
        return true;
    };

    const updateReview = (r: Review) => {
        setReviews((prev) => prev.map((x) => (x.id === r.id ? r : x)));
        if (mine?.id === r.id) setMine(r);
    };

    // Your own review shows on top; the list shows everyone else's
    const others = reviews.filter((r) => r.id !== mine?.id);
    const totalLabel = summary.count;

    return (
        <section id="reviews" className="mt-10 md:mt-12 pb-12 md:pb-20 scroll-mt-24">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pb-3 border-b border-dashed border-gray-200 dark:border-dark-border">
                <h2 className="text-sm md:text-lg font-semibold text-gray-700 dark:text-neutral-300">Reader Reviews ({totalLabel})</h2>
                {summary.average !== null && (
                    <div className="flex items-center gap-2">
                        <StarRating rating={summary.average} size="sm" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-neutral-200">{summary.average.toFixed(1)}/5</span>
                    </div>
                )}
            </div>

            {/* Write / your review */}
            {!loading && !failed && (
                <div className="py-5 border-b border-dashed border-gray-200 dark:border-dark-border">
                    {!userId ? (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm text-gray-600 dark:text-neutral-400">Sign in to rate and review this book.</p>
                            <button type="button" onClick={openSignIn} className="px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold">
                                Sign in to review
                            </button>
                        </div>
                    ) : mine && !editing ? (
                        <>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-neutral-500">Your review</p>
                            <ReviewItem review={mine} onChange={updateReview} onReport={setReport}
                                onEdit={() => setEditing(true)} onDelete={() => setDeleting(true)} />
                        </>
                    ) : eligibility?.canReview || (mine && editing) ? (
                        <>
                            <p className="mb-3 text-sm font-semibold text-gray-800 dark:text-neutral-200">
                                {mine ? "Edit your review" : "Rate this book"}
                            </p>
                            <ReviewForm
                                key={mine ? `edit-${mine.id}` : "new"}
                                initialRating={mine?.rating ?? 0}
                                initialContent={mine?.content ?? ""}
                                submitLabel={mine ? "Save changes" : "Post Review"}
                                onCancel={mine ? () => setEditing(false) : undefined}
                                onSubmit={saveReview}
                            />
                        </>
                    ) : eligibility?.ownBook ? (
                        <p className="text-sm text-gray-500 dark:text-neutral-400">You can&apos;t review your own book.</p>
                    ) : eligibility ? (
                        <div>
                            <p className="text-sm text-gray-600 dark:text-neutral-400">
                                Read at least {eligibility.needed} {eligibility.needed === 1 ? "chapter" : "chapters"} to review this book.
                            </p>
                            <div className="mt-2 flex items-center gap-3">
                                <div className="h-1.5 w-40 rounded-full bg-gray-200 dark:bg-dark-raised overflow-hidden">
                                    <div className="h-full bg-red-600" style={{ width: `${Math.min(100, (eligibility.read / eligibility.needed) * 100)}%` }} />
                                </div>
                                <span className="text-xs text-gray-500 dark:text-neutral-400">{eligibility.read}/{eligibility.needed} read</span>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}

            {/* The reviews */}
            {loading ? (
                <div className="space-y-6 pt-5">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="flex gap-4 animate-pulse">
                            <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-dark-raised shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-32 rounded bg-gray-200 dark:bg-dark-raised" />
                                <div className="h-3 w-24 rounded bg-gray-200 dark:bg-dark-raised" />
                                <div className="h-3 w-full rounded bg-gray-200 dark:bg-dark-raised" />
                                <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-dark-raised" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : failed ? (
                <div className="py-8 text-center">
                    <p className="text-sm text-gray-500 dark:text-neutral-400 mb-3">Couldn&apos;t load the reviews.</p>
                    <button type="button" onClick={load} className="border border-red-500 text-red-500 px-4 py-2 rounded-full text-sm">Try again</button>
                </div>
            ) : others.length === 0 ? (
                !mine && <p className="mt-4 text-sm text-gray-500 dark:text-neutral-400">No reviews yet. Be the first to review this book.</p>
            ) : (
                <>
                    {others.map((r) => (
                        <ReviewItem key={r.id} review={r} onChange={updateReview} onReport={setReport} />
                    ))}
                    {hasMore && (
                        <div className="mt-6 flex justify-center">
                            <button type="button" onClick={loadMore} disabled={more.busy}
                                className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-100 dark:border-dark-border dark:hover:bg-dark-card disabled:opacity-60">
                                {more.busy ? "Loading..." : "Show More"}
                            </button>
                        </div>
                    )}
                </>
            )}

            <ReportDialog target={report} onClose={() => setReport(null)} />
            <ConfirmDialog open={deleting} onClose={() => setDeleting(false)} title="Delete review"
                text="Your rating and review of this book will be removed."
                onConfirm={async () => {
                    if (!mine) return true;
                    const { ok, data } = await sendJson(`/api/reviews/${mine.id}`, "DELETE");
                    if (!ok) { toast.error(data.message || "Couldn't delete your review"); return false; }
                    toast.success("Review deleted");
                    setReviews((prev) => prev.filter((r) => r.id !== mine.id));
                    setMine(null);
                    load();
                    return true;
                }} />
        </section>
    );
}