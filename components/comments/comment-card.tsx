"use client";

import { useRef } from "react";
import { ThumbsUp } from "lucide-react";
import { toast } from "@/lib/store/toastStore";
import { useAuthStore } from "@/lib/store/authStore";
import { useAuthModals } from "@/lib/store/auth-card-store";
import { Avatar, formatDateTime } from "@/components/reviews/stars";
import { useTranslations } from "next-intl";

export type Comment = {
    id: string;
    name: string;
    avatar?: string | null;
    content: string;
    createdAt: string;
    likes: number;
    liked?: boolean;
    mine?: boolean;
    isAuthor?: boolean;
    publicId?: string | null;
    status?: string;
    replies?: Comment[];
};

type Props = {
    comment: Comment;
    isReply?: boolean;
    onChange?: (c: Comment) => void;
    onReply?: (c: Comment) => void;
    onReport?: (c: Comment) => void;
    onDelete?: (c: Comment) => void;
};

export default function CommentCard({ comment, isReply, onChange, onReply, onReport, onDelete }: Props) {
    const signedIn = useAuthStore((s) => Boolean(s.user));
    const openSignIn = useAuthModals((s) => s.openSignIn);
    const likeBusy = useRef(false);
    const t = useTranslations("Comments");
    const c = useTranslations("Common");

    const toggleLike = async () => {
        if (!signedIn) return openSignIn();
        if (comment.mine || likeBusy.current || !onChange) return;
        likeBusy.current = true;
        const like = !comment.liked;
        onChange({ ...comment, liked: like, likes: comment.likes + (like ? 1 : -1) });
        try {
            const res = await fetch(`/api/comments/${comment.id}/like`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ like }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) onChange({ ...comment, liked: data.liked, likes: data.likes });
            else {
                onChange(comment);
                toast.error(data.message || t("couldntLike"));
            }
        } catch {
            onChange(comment);
            toast.error(c("networkError"));
        } finally {
            likeBusy.current = false;
        }
    };

    return (
        <div className={`flex gap-3 py-4 ${isReply ? "" : "border-b border-gray-200 dark:border-dark-border"}`}>
            {/* Avatar */}
            <Avatar src={comment.avatar} name={comment.name} size={isReply ? 32 : 40} />

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white truncate">{comment.name}</h4>
                    {comment.isAuthor && (
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-red-600 text-white">{t("author")}</span>
                    )}
                </div>

                <p className="text-gray-700 dark:text-neutral-200 mt-1 text-sm leading-relaxed whitespace-pre-line wrap-break-word">
                    {comment.content}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between mt-3 text-xs text-gray-500 dark:text-neutral-400">
                    <div className="flex items-center gap-3">
                        <span>{formatDateTime(comment.createdAt)}</span>
                        {onReply && (
                            <button type="button" onClick={() => (signedIn ? onReply(comment) : openSignIn())} className="hover:text-red-500 font-medium">
                                {t("reply")}
                            </button>
                        )}
                        {comment.mine && onDelete && (
                            <button type="button" onClick={() => onDelete(comment)} className="hover:text-red-500">{c("delete")}</button>
                        )}
                        {!comment.mine && onReport && (
                            <button type="button" onClick={() => (signedIn ? onReport(comment) : openSignIn())} className="hover:text-red-500">
                                {t("report")}
                            </button>
                        )}
                    </div>

                    <button type="button" onClick={toggleLike} disabled={comment.mine} aria-label={t("like")}
                        className={`flex items-center gap-1 disabled:cursor-default ${comment.liked ? "text-red-600" : ""}`}>
                        <ThumbsUp size={14} className={comment.liked ? "fill-red-600" : ""} />
                        <span>{comment.likes}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}