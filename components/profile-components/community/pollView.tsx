"use client";
import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuthStore } from "@/lib/store/authStore";
import { useAuthModals } from "@/lib/store/auth-card-store";
import { toast } from "@/lib/store/toastStore";
import { JSON_HEADERS, call } from "@/lib/communityPage/api";
import { ago } from "@/lib/communityPage/time";
import type { Change, Poll, Post } from "@/lib/communityPage/types";

// A poll on a post: options to vote on, then percentage bars once you've voted or it has ended
export default function PollView({ postId, poll, onChange }: { postId: string; poll: Poll; onChange: Change }) {
    const t = useTranslations("Community");
    const locale = useLocale();
    const user = useAuthStore((s) => s.user);
    const openSignIn = useAuthModals((s) => s.openSignIn);
    const busy = useRef(false);
    const [voting, setVoting] = useState(false);

    const showResults = poll.ended || poll.my_vote !== null;

    const vote = async (i: number) => {
        if (!user) return openSignIn();
        if (busy.current || poll.ended || poll.my_vote !== null) return;
        busy.current = true;
        setVoting(true);
        const { ok, data } = await call<{ post: Post }>(`/api/community/posts/${postId}/vote`, {
            method: "POST",
            headers: JSON_HEADERS,
            body: JSON.stringify({ option: i }),
        });
        if (ok && data.post?.poll) {
            const next = data.post.poll;
            onChange(postId, (p) => ({ ...p, poll: next }));
        } else {
            toast.error(data.message ?? t("error"));
        }
        busy.current = false;
        setVoting(false);
    };

    return (
        <div className="px-4 pb-3 flex flex-col gap-2">
            {poll.options.map((o, i) => {
                if (!showResults) {
                    return (
                        <button key={i} onClick={() => vote(i)} disabled={voting}
                            className="w-full text-left rounded-lg border border-gray-300 dark:border-dark-border px-3 py-2 text-sm text-gray-800 dark:text-neutral-100 hover:bg-gray-50 dark:hover:bg-dark-raised disabled:opacity-60 transition-colors">
                            {o.label}
                        </button>
                    );
                }
                const votes = o.votes ?? 0;
                const pct = poll.total ? Math.round((votes / poll.total) * 100) : 0;
                const mine = poll.my_vote === i;
                return (
                    <div key={i} className="relative w-full overflow-hidden rounded-lg border border-gray-200 dark:border-dark-border">
                        <div className={`absolute inset-y-0 left-0 ${mine ? "bg-rose-200 dark:bg-rose-500/30" : "bg-gray-100 dark:bg-dark-raised"}`} style={{ width: `${pct}%` }} />
                        <div className="relative flex items-center justify-between gap-3 px-3 py-2 text-sm">
                            <span className="flex items-center gap-1.5 min-w-0 text-gray-800 dark:text-neutral-100">
                                {mine && <Check className="w-4 h-4 text-rose-600 shrink-0" />}
                                <span className="truncate">{o.label}</span>
                            </span>
                            <span className="font-semibold text-gray-700 dark:text-neutral-200 shrink-0">{pct}%</span>
                        </div>
                    </div>
                );
            })}
            <p className="text-xs text-gray-500 dark:text-neutral-400">
                {t("pollVotes", { count: poll.total })} ·{" "}
                {poll.ended ? t("pollEnded") : t("pollEndsAt", { when: ago(poll.ends_at, locale, t("justNow")) })}
                {!showResults && ` · ${t("pollVoteToSee")}`}
            </p>
        </div>
    );
}