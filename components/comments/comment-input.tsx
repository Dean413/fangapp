"use client";

import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { toast } from "react-toastify";
import { useAuthStore } from "@/lib/store/authStore";
import { useAuthModals } from "@/lib/store/auth-card-store";
import { Avatar } from "@/components/reviews/stars";
import type { Comment } from "./comment-card";

const MAX = 1000;

type Props = {
    chapterId: string;
    replyingTo?: Comment | null;
    onCancelReply?: () => void;
    onPosted?: (comment: Comment, parentId: string | null) => void;
};

export default function CommentInput({ chapterId, replyingTo, onCancelReply, onPosted }: Props) {
    const user = useAuthStore((s) => s.user);
    const openSignIn = useAuthModals((s) => s.openSignIn);
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const busy = useRef(false);
    const box = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
        if (replyingTo) box.current?.focus();
    }, [replyingTo]);

    const handleSubmit = async () => {
        if (busy.current) return;
        if (!user) return openSignIn();
        if (!message.trim()) return;
        busy.current = true;
        setSending(true);
        try {
            const res = await fetch("/api/comments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ chapterId, content: message, parentId: replyingTo?.id ?? null }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast.error(data.message || "Couldn't post your comment");
                return;
            }
            setMessage("");
            onPosted?.(data.comment, data.parentId ?? null);
        } catch {
            toast.error("Unable to reach the server. Please try again.");
        } finally {
            busy.current = false;
            setSending(false);
        }
    };

    const name = user?.username || user?.full_name || "You";

    return (
        <div className="flex gap-3 items-start py-4 border-b border-gray-200 dark:border-dark-border">

            {/* User avatar */}
            {user ? <Avatar src={user.avatar_url} name={name} size={40} /> : <div className="w-10 h-10 rounded-full bg-black dark:bg-neutral-700 shrink-0" />}

            <div className="flex-1 min-w-0">
                {replyingTo && (
                    <div className="mb-2 flex items-center justify-between gap-2 rounded-md bg-gray-100 dark:bg-dark-raised px-3 py-1.5 text-xs text-gray-600 dark:text-neutral-300">
                        <span className="truncate">Replying to <strong>{replyingTo.name}</strong></span>
                        <button type="button" onClick={onCancelReply} aria-label="Cancel reply"><X size={14} /></button>
                    </div>
                )}

                <div className="relative">
                    <textarea
                        ref={box}
                        value={message}
                        onChange={(e) => setMessage(e.target.value.slice(0, MAX))}
                        onFocus={() => { if (!user) openSignIn(); }}
                        disabled={sending}
                        placeholder={user ? (replyingTo ? "Write a reply..." : "Write a comment...") : "Sign in to comment"}
                        className="w-full min-h-20 resize-none rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent px-4 py-3 pb-6 text-sm outline-none focus:border-black dark:focus:border-white"
                    />
                    {message.length > 0 && <span className="absolute right-3 bottom-3 text-[10px] text-gray-400">{message.length}/{MAX}</span>}
                </div>

                <div className="flex justify-end mt-2">
                    <button type="button" onClick={handleSubmit} disabled={sending || (Boolean(user) && !message.trim())}
                        className="flex items-center gap-2 bg-red-800 text-white px-4 py-2 rounded-lg text-sm hover:opacity-80 transition disabled:opacity-50">
                        {sending ? "Sending..." : user ? (replyingTo ? "Reply" : "Comment") : "Sign in"}
                        {!sending && <Send size={15} />}
                    </button>
                </div>

            </div>

        </div>
    );
}