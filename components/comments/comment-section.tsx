"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useAuthStore } from "@/lib/store/authStore";
import CommentCard, { type Comment } from "./comment-card";
import CommentInput from "./comment-input";
import { ConfirmDialog, ReportDialog, type ReportTarget } from "@/components/reviews/reviewsDialog";

export default function CommentSection({ chapterId }: { chapterId: string }) {
    const userId = useAuthStore((s) => s.user?.id ?? null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [failed, setFailed] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
    const [report, setReport] = useState<ReportTarget | null>(null);
    const [deleting, setDeleting] = useState<Comment | null>(null);
    const requestId = useRef(0);
    const moreBusy = useRef(false);

    const load = useCallback(async () => {
        const id = ++requestId.current;
        setLoading(true);
        setFailed(false);
        try {
            const res = await fetch(`/api/comments?chapter=${encodeURIComponent(chapterId)}`, { credentials: "include", cache: "no-store" });
            const data = await res.json().catch(() => ({}));
            if (id !== requestId.current) return;
            if (!res.ok) { setFailed(true); return; }
            setComments(data.comments ?? []);
            setTotal(Number(data.total) || 0);
            setHasMore(Boolean(data.hasMore));
        } catch {
            if (id === requestId.current) setFailed(true);
        } finally {
            if (id === requestId.current) setLoading(false);
        }
    }, [chapterId]);

    useEffect(() => { load(); }, [load, userId]);

    const loadMore = async () => {
        if (moreBusy.current || !hasMore) return;
        const last = comments[comments.length - 1]?.id;
        if (!last) return;
        moreBusy.current = true;
        setLoadingMore(true);
        try {
            const res = await fetch(`/api/comments?chapter=${encodeURIComponent(chapterId)}&before=${last}`, { credentials: "include", cache: "no-store" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) return void toast.error(data.message || "Couldn't load more comments");
            setComments((prev) => [...prev, ...(data.comments ?? []).filter((c: Comment) => !prev.some((p) => p.id === c.id))]);
            setHasMore(Boolean(data.hasMore));
        } catch {
            toast.error("Unable to reach the server. Please try again.");
        } finally {
            moreBusy.current = false;
            setLoadingMore(false);
        }
    };

    // Replace a comment (or a reply) after a like
    const update = (c: Comment) =>
        setComments((prev) => prev.map((top) => top.id === c.id
            ? { ...c, replies: top.replies }
            : { ...top, replies: top.replies?.map((r) => (r.id === c.id ? c : r)) }));

    const posted = (c: Comment, parentId: string | null) => {
        setTotal((t) => t + 1);
        setReplyingTo(null);
        if (parentId) {
            setComments((prev) => prev.map((top) => (top.id === parentId ? { ...top, replies: [...(top.replies ?? []), c] } : top)));
        } else {
            setComments((prev) => [{ ...c, replies: [] }, ...prev]);
        }
    };

    const toReport = (c: Comment) =>
        setReport({ type: "comment", id: c.id, name: c.name, avatar: c.avatar, publicId: c.publicId, status: c.status, content: c.content });

    return (
        <div className="w-80 md:w-105 fixed right-5 md:right-15 top-1/2 -translate-y-1/2 bg-white dark:bg-dark-card rounded-xl shadow-xl p-4 z-50">
            <div className="py-4 border-b border-gray-300 dark:border-neutral-700">
                <h3 className="font-semibold text-black dark:text-white text-lg">
                    Comments ({total})
                </h3>
            </div>

            {/* Comment box */}
            <CommentInput chapterId={chapterId} replyingTo={replyingTo} onCancelReply={() => setReplyingTo(null)} onPosted={posted} />

            {/* Comments */}
            <div className="max-h-60 overflow-y-auto"
                onScroll={(e) => {
                    const el = e.currentTarget;
                    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) loadMore();
                }}>
                {loading ? (
                    <div className="space-y-3 py-4">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="flex gap-3 animate-pulse">
                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-dark-raised shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 w-24 rounded bg-gray-200 dark:bg-dark-raised" />
                                    <div className="h-3 w-full rounded bg-gray-200 dark:bg-dark-raised" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : failed ? (
                    <div className="py-6 text-center">
                        <p className="text-sm text-gray-500 dark:text-neutral-400 mb-3">Couldn&apos;t load the comments.</p>
                        <button type="button" onClick={load} className="border border-red-500 text-red-500 px-4 py-1.5 rounded-full text-sm">Try again</button>
                    </div>
                ) : comments.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-500 dark:text-neutral-400">No comments yet. Be the first to comment.</p>
                ) : (
                    <>
                        {comments.map((c) => (
                            <div key={c.id}>
                                <CommentCard comment={c} onChange={update} onReply={setReplyingTo} onReport={toReport} onDelete={setDeleting} />
                                {(c.replies?.length ?? 0) > 0 && (
                                    <div className="ml-12 border-b border-gray-200 dark:border-dark-border">
                                        {c.replies!.map((r) => (
                                            <CommentCard key={r.id} comment={r} isReply onChange={update}
                                                onReply={() => setReplyingTo(c)} onReport={toReport} onDelete={setDeleting} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {loadingMore && <p className="py-3 text-center text-xs text-gray-400">Loading...</p>}
                    </>
                )}
            </div>

            <ReportDialog target={report} onClose={() => setReport(null)} />
            <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Delete comment"
                text="This comment and its replies will be removed for everyone."
                onConfirm={async () => {
                    if (!deleting) return true;
                    const res = await fetch(`/api/comments/${deleting.id}`, { method: "DELETE", credentials: "include" });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) { toast.error(data.message || "Couldn't delete your comment"); return false; }
                    const removed = deleting;
                    const top = comments.find((t) => t.id === removed.id);
                    setTotal((n) => Math.max(0, n - 1 - (top?.replies?.length ?? 0)));
                    setComments((prev) => prev
                        .filter((t) => t.id !== removed.id)
                        .map((t) => ({ ...t, replies: t.replies?.filter((r) => r.id !== removed.id) })));
                    toast.success("Comment deleted");
                    return true;
                }} />
        </div>
    );
}