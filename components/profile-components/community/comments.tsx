"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuthStore } from "@/lib/store/authStore";
import { useAuthModals } from "@/lib/store/auth-card-store";
import { toast } from "@/lib/store/toastStore";
import { ConfirmDialog } from "@/components/reviews/reviewsDialog";
import { AuthorLink, PostAvatar } from "./author";
import { JSON_HEADERS, call } from "@/lib/communityPage/api";
import { ago } from "@/lib/communityPage/time";
import type { Comment, Vip } from "@/lib/communityPage/types";

const fetchPage = (postId: string, cursor: string | null) =>
    call<{ comments: Comment[]; nextCursor: string | null }>(
        `/api/community/posts/${postId}/comments${cursor ? `?cursor=${cursor}` : ""}`
    );

// The comment box and list under a post (mounted when the post's comments are opened)
export default function CommentSection({ postId, myVip, onCountChange }: {
    postId: string;
    myVip: Vip;
    onCountChange: (delta: number) => void;
}) {
    const t = useTranslations("Community");
    const locale = useLocale();
    const user = useAuthStore((s) => s.user);
    const openSignIn = useAuthModals((s) => s.openSignIn);

    const [comments, setComments] = useState<Comment[]>([]);
    const [cursor, setCursor] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const sendBusy = useRef(false);
    const [deleting, setDeleting] = useState<Comment | null>(null);
    const [editId, setEditId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState("");
    const [savingEdit, setSavingEdit] = useState(false);
    const editBusy = useRef(false);

    useEffect(() => {
        let alive = true;
        fetchPage(postId, null).then(({ ok, data }) => {
            if (!alive) return;
            if (ok && data.comments) {
                setComments(data.comments);
                setCursor(data.nextCursor ?? null);
                setLoaded(true);
            } else {
                toast.error(data.message ?? t("error"));
            }
            setLoading(false);
        });
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [postId]);

    const loadMore = async () => {
        if (loading || !cursor) return;
        setLoading(true);
        const { ok, data } = await fetchPage(postId, cursor);
        if (ok && data.comments) {
            setComments((prev) => [...prev, ...data.comments!]);
            setCursor(data.nextCursor ?? null);
        } else {
            toast.error(data.message ?? t("error"));
        }
        setLoading(false);
    };

    const send = async () => {
        if (!user) return openSignIn();
        const body = draft.trim();
        if (!body || sendBusy.current) return;
        sendBusy.current = true;
        setSending(true);
        const { ok, data } = await call<{ comment: Comment }>(`/api/community/posts/${postId}/comments`, {
            method: "POST",
            headers: JSON_HEADERS,
            body: JSON.stringify({ body }),
        });
        if (ok && data.comment) {
            setComments((prev) => [data.comment!, ...prev]);
            onCountChange(1);
            setDraft("");
        } else {
            toast.error(data.message ?? t("error"));
        }
        sendBusy.current = false;
        setSending(false);
    };

    // Called by the confirm popup; true closes it
    const remove = async () => {
        if (!deleting) return true;
        const { ok, data } = await call(`/api/community/comments/${deleting.id}`, { method: "DELETE" });
        if (!ok) {
            toast.error(data.message ?? t("error"));
            return false;
        }
        const id = deleting.id;
        setComments((prev) => prev.filter((c) => c.id !== id));
        onCountChange(-1);
        return true;
    };

    const startEdit = (c: Comment) => {
        setEditId(c.id);
        setEditDraft(c.body);
    };

    const saveEdit = async (c: Comment) => {
        const body = editDraft.trim();
        if (!body || body === c.body || editBusy.current) return;
        editBusy.current = true;
        setSavingEdit(true);
        const { ok, data } = await call<{ comment: Comment }>(`/api/community/comments/${c.id}`, {
            method: "PATCH",
            headers: JSON_HEADERS,
            body: JSON.stringify({ body }),
        });
        if (ok && data.comment) {
            const updated = data.comment;
            setComments((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
            setEditId(null);
        } else {
            toast.error(data.message ?? t("error"));
        }
        editBusy.current = false;
        setSavingEdit(false);
    };

    return (
        <div className="min-w-0 px-3 sm:px-4 pb-4 pt-2 border-t border-gray-100 dark:border-dark-border flex flex-col gap-3">
            {user ? (
                <div className="flex items-center gap-2 min-w-0">
                    <PostAvatar person={{ avatar_url: user.avatar_url ?? null, vip: myVip }} name={user.username || user.full_name || ""} size={32} />
                    <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={1000}
                        onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                        placeholder={t("writeComment")}
                        className="flex-1 min-w-0 bg-gray-100 dark:bg-dark-raised rounded-full px-4 py-2 text-sm text-gray-700 dark:text-neutral-200 placeholder-gray-400 dark:placeholder-neutral-500 outline-none focus:ring-2 focus:ring-rose-300" />
                    <button onClick={send} disabled={sending || !draft.trim()}
                        className="shrink-0 whitespace-nowrap bg-red-700 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold px-3 sm:px-4 py-2 rounded-full">
                        {sending ? t("sending") : t("send")}
                    </button>
                </div>
            ) : (
                <button onClick={openSignIn} className="text-left text-sm text-gray-400 dark:text-neutral-500">{t("signInToComment")}</button>
            )}

            {loading && !comments.length && <p className="text-xs text-gray-400 dark:text-neutral-500">{t("loading")}</p>}
            {loaded && !comments.length && <p className="text-xs text-gray-400 dark:text-neutral-500">{t("noComments")}</p>}

            {comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2 min-w-0">
                    <AuthorLink slug={c.author.slug} className="shrink-0">
                        <PostAvatar person={c.author} name={c.author.name ?? t("reader")} size={32} />
                    </AuthorLink>
                    <div className="min-w-0 flex-1">
                        <div className="bg-gray-100 dark:bg-dark-raised rounded-2xl px-3 py-2">
                            <AuthorLink slug={c.author.slug} className="block min-w-0">
                                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate group-hover:underline">{c.author.name ?? t("reader")}</p>
                            </AuthorLink>
                            {editId === c.id ? (
                                <input value={editDraft} onChange={(e) => setEditDraft(e.target.value)} maxLength={1000} autoFocus
                                    onKeyDown={(e) => { if (e.key === "Enter") saveEdit(c); if (e.key === "Escape") setEditId(null); }}
                                    className="mt-1 w-full min-w-0 bg-white dark:bg-dark-card rounded-lg px-2 py-1 text-sm text-gray-800 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-rose-300" />
                            ) : (
                                <p className="text-sm text-gray-800 dark:text-neutral-100 whitespace-pre-wrap wrap-break-word">{c.body}</p>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 px-2 text-[11px] text-gray-400 dark:text-neutral-500">
                            <span className="whitespace-nowrap">
                                {ago(c.created_at, locale, t("justNow"))}{c.edited ? ` · ${t("edited")}` : ""}
                            </span>
                            {c.mine && editId === c.id && (
                                <>
                                    <button onClick={() => saveEdit(c)} disabled={savingEdit || !editDraft.trim() || editDraft.trim() === c.body}
                                        className="text-rose-500 font-semibold whitespace-nowrap disabled:opacity-60">
                                        {savingEdit ? t("saving") : t("save")}
                                    </button>
                                    <button onClick={() => setEditId(null)} disabled={savingEdit} className="whitespace-nowrap">{t("cancel")}</button>
                                </>
                            )}
                            {c.mine && editId !== c.id && (
                                <>
                                    <button onClick={() => startEdit(c)} className="hover:text-rose-500 whitespace-nowrap">{t("edit")}</button>
                                    <button onClick={() => setDeleting(c)} className="hover:text-red-500 whitespace-nowrap">{t("delete")}</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ))}

            {cursor && (
                <button onClick={loadMore} disabled={loading}
                    className="self-start text-xs font-semibold text-rose-500 hover:underline disabled:opacity-60">
                    {loading ? t("loading") : t("moreComments")}
                </button>
            )}

            <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)}
                title={t("deleteCommentTitle")} text={t("deleteCommentText")} onConfirm={remove} />
        </div>
    );
}