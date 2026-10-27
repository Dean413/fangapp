"use client";
import { Flame } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/reviews/stars";
import { Link } from "@/i18n/routing";
import type { Member, Trend } from "@/lib/communityPage/types";

// Top #tags of the last 30 days; clicking one filters the feed
export function TrendingCard({ trending, active, onPick }: { trending: Trend[]; active: string | null; onPick: (tag: string) => void }) {
    const t = useTranslations("Community");
    return (
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-4">
            <div className="flex items-center gap-2 mb-4">
                <h2 className="font-bold text-gray-900 dark:text-white text-sm">{t("trending")}</h2>
                <Flame className="w-4 h-4 text-rose-500" />
            </div>
            {trending.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-neutral-500">{t("noTrending")}</p>
            ) : (
                <ul className="flex flex-col gap-3">
                    {trending.map((topic) => (
                        <li key={topic.tag}>
                            <button onClick={() => onPick(topic.tag)} className="w-full flex items-center justify-between gap-2 text-left">
                                <span className={`text-sm font-semibold truncate hover:underline ${active === topic.tag ? "text-rose-700 dark:text-rose-300" : "text-rose-500"}`}>#{topic.tag}</span>
                                <span className="text-xs text-gray-400 dark:text-neutral-500 shrink-0">{t("tagPosts", { count: topic.posts })}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// Top authors by followers, with a Follow button
export function AuthorsCard({ members, onFollow }: { members: Member[]; onFollow: (m: Member) => void }) {
    const t = useTranslations("Community");
    if (members.length === 0) return null;
    return (
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-4">
            <h2 className="font-bold text-gray-900 dark:text-white text-sm mb-4">{t("popularMembers")}</h2>
            <ul className="flex flex-col gap-4">
                {members.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2">
                        <Link href={`/authors/${m.slug}`} className="flex items-center gap-2 min-w-0 group">
                            <Avatar src={m.avatar_url} name={m.name} size={32} />
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800 dark:text-neutral-100 leading-tight truncate group-hover:underline">{m.name}</p>
                                <p className="text-xs text-gray-400 dark:text-neutral-500">{t("followers", { count: m.followers })}</p>
                            </div>
                        </Link>
                        <button onClick={() => onFollow(m)}
                            className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors shrink-0 ${m.following ? "bg-rose-500 text-white border border-rose-500" : "border border-rose-400 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"}`}>
                            {m.following ? t("following") : t("follow")}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}