"use client";
import { useRef, useState } from "react";
import { Globe, Heart, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuthStore } from "@/lib/store/authStore";
import { useAuthModals } from "@/lib/store/auth-card-store";
import { toast } from "@/lib/store/toastStore";
import { ConfirmDialog } from "@/components/reviews/reviewsDialog";
import { AuthorLink, PostAvatar } from "./author";
import Body from "./body";
import CommentSection from "./comments";
import PollView from "./pollView";
import { JSON_HEADERS, call } from "@/lib/communityPage/api";
import { ago } from "@/lib/communityPage/time";
import type { Change, Post, Vip } from "@/lib/communityPage/types";

export default function PostCard({ post, onChange, onRemove, myVip }: {
    post: Post;
    onChange: Change;
    onRemove: (id: string) => void;
    myVip: Vip;
}) {
    const t = useTranslations("Community");
    const locale = useLocale();
    const user = useAuthStore((s) => s.user);
    const openSignIn = useAuthModals((s) => s.openSignIn);

    const likeBusy = useRef(false);
    const saveBusy = useRef(false);
    const [confirming, setConfirming] = useState(false);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState("");
    const [saving, setSaving] = useState(false);

    const name = post.author.name ?? t("reader");

    const trimmed = draft.trim();
    // An image-only post may be emptied; a poll post must keep its question
    const canSave = trimmed !== post.body && (trimmed.length > 0 || (!!post.image_url && !post.poll));

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

    // Called by the confirm popup; true closes it
    const remove = async () => {
        const { ok, data } = await call(`/api/community/posts/${post.id}`, { method: "DELETE" });
        if (!ok) {
            toast.error(data.message ?? t("error"));
            return false;
        }
        onRemove(post.id);
        return true;
    };

    const startEdit = () => {
        setDraft(post.body);
        setEditing(true);
    };

    const save = async () => {
        if (saveBusy.current || !canSave) return;
        saveBusy.current = true;
        setSaving(true);
        const { ok, data } = await call<{ post: Post }>(`/api/community/posts/${post.id}`, {
            method: "PATCH",
            headers: JSON_HEADERS,
            body: JSON.stringify({ body: trimmed }),
        });
        if (ok && data.post) {
            const updated = data.post;
            onChange(post.id, () => updated);
            setEditing(false);
        } else {
            toast.error(data.message ?? t("error"));
        }
        saveBusy.current = false;
        setSaving(false);
    };

    return (
        <div className="min-w-0 overflow-hidden bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border">
            <div className="flex items-start justify-between px-3 sm:px-4 pt-4 pb-2 gap-3">
                <AuthorLink slug={post.author.slug} className="flex items-center gap-3 min-w-0">
                    <PostAvatar person={post.author} name={name} size={40} />
                    <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate group-hover:underline">{name}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-neutral-500 whitespace-nowrap overflow-hidden">
                            <span className="truncate">{ago(post.created_at, locale, t("justNow"))}</span>
                            {post.edited && (
                                <>
                                    <span>·</span>
                                    <span className="truncate">{t("edited")}</span>
                                </>
                            )}
                            <span>·</span>
                            <Globe className="w-3 h-3 shrink-0" />
                            <span className="hidden sm:inline">{t("public")}</span>
                        </div>
                    </div>
                </AuthorLink>
                {post.mine && !editing && (
                    <div className="flex items-center shrink-0">
                        <button onClick={startEdit} aria-label={t("edit")}
                            className="text-gray-400 dark:text-neutral-500 hover:text-rose-500 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-dark-raised">
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setConfirming(true)} aria-label={t("delete")}
                            className="text-gray-400 dark:text-neutral-500 hover:text-red-500 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-dark-raised">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {editing ? (
                <div className="px-3 sm:px-4 pb-3 flex flex-col gap-2">
                    <textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000} rows={3} autoFocus
                        className="w-full min-w-0 resize-none bg-gray-100 dark:bg-dark-raised rounded-2xl px-4 py-2 text-sm text-gray-700 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-rose-300" />
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setEditing(false)} disabled={saving}
                            className="text-xs font-semibold px-3 py-1.5 rounded-full border border-gray-300 dark:border-dark-border text-gray-600 dark:text-neutral-300 whitespace-nowrap">
                            {t("cancel")}
                        </button>
                        <button onClick={save} disabled={saving || !canSave}
                            className="bg-red-700 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold px-4 py-1.5 rounded-full whitespace-nowrap">
                            {saving ? t("saving") : t("save")}
                        </button>
                    </div>
                </div>
            ) : (
                post.body && (
                    <div className="px-3 sm:px-4 pb-3 wrap-break-word">
                        <Body text={post.body} />
                    </div>
                )
            )}

            {post.poll && <PollView postId={post.id} poll={post.poll} onChange={onChange} />}

            {post.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.image_url} alt="" loading="lazy" className="w-full max-h-128 object-cover bg-gray-100 dark:bg-dark-raised" />
            )}

            <div className="px-3 sm:px-4 py-2 flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-neutral-400 border-b border-gray-100 dark:border-dark-border">
                <div className="flex items-center gap-1 min-w-0 whitespace-nowrap">
                    <span className="w-4 h-4 shrink-0 bg-rose-500 rounded-full flex items-center justify-center text-white text-[8px]">♥</span>
                    <span className="truncate">{t("likes", { count: post.likes })}</span>
                </div>
                <button onClick={() => setOpen((v) => !v)} className="hover:underline whitespace-nowrap truncate min-w-0">{t("comments", { count: post.comments })}</button>
            </div>

            <div className="px-2 py-1 flex items-center gap-1">
                <button onClick={like}
                    className={`flex flex-1 min-w-0 items-center justify-center gap-2 px-2 sm:px-6 py-2 rounded-lg text-sm font-medium transition-colors ${post.liked ? "text-rose-500 bg-rose-50 dark:bg-rose-500/10" : "text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-dark-raised"}`}>
                    <Heart className={`w-4 h-4 shrink-0 ${post.liked ? "fill-rose-500 text-rose-500" : ""}`} />
                    <span className="truncate">{t("like")}</span>
                </button>
                <button onClick={() => setOpen((v) => !v)}
                    className={`flex flex-1 min-w-0 items-center justify-center gap-2 px-2 sm:px-6 py-2 rounded-lg text-sm font-medium transition-colors ${open ? "text-rose-500" : "text-gray-500 dark:text-neutral-400"} hover:bg-gray-100 dark:hover:bg-dark-raised`}>
                    <MessageCircle className="w-4 h-4 shrink-0" />
                    <span className="truncate">{t("comment")}</span>
                </button>
            </div>

            {open && (
                <CommentSection
                    postId={post.id}
                    myVip={myVip}
                    onCountChange={(delta) => onChange(post.id, (p) => ({ ...p, comments: Math.max(0, p.comments + delta) }))}
                />
            )}

            <ConfirmDialog open={confirming} onClose={() => setConfirming(false)}
                title={t("deletePostTitle")} text={t("deletePostText")} onConfirm={remove} />
        </div>
    );
}