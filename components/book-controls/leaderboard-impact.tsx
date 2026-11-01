"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, Gem, Gift } from "lucide-react";
import GiftCard from "@/components/book-controls/gift";
import Image from "next/image";

type Summary = { supporters: number; top: { name: string | null; avatar: string | null }[] };

type Props = {
    book: { slug: string; title: string; image: string; genreSlug: string };
};

// A fan's photo, or their initial when there is none (or it fails to load)
function Face({ name, src }: { name: string | null; src: string | null }) {
    const [failed, setFailed] = useState(false);
    const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
    return (
        <span className="-ml-2 flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gray-100 text-[11px] font-semibold text-gray-600 first:ml-0 dark:border-dark-card dark:bg-dark-raised dark:text-neutral-300">
            {src && !failed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={name ?? ""} onError={() => setFailed(true)} className="h-full w-full object-cover" />
            ) : initial}
        </span>
    );
}

export default function LeaderboardImpact({ book }: Props) {
    const t = useTranslations("Fans");
    const [summary, setSummary] = useState<Summary | null>(null);
    const [card, setCard] = useState<"gifts" | "ruby" | null>(null);

    const load = useCallback(() => {
        fetch(`/api/stories/${book.slug}/fans`, { cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => { if (data) setSummary(data); })
            .catch(() => { });
    }, [book.slug]);

    useEffect(() => { load(); }, [load]);

    const supporters = summary?.supporters ?? 0;
    const hasFans = !!summary && summary.top.length > 0;
    const giftsHref = `/stories/${book.genreSlug}/${book.slug}/fans`;   // Top Fans (gifts)
    const votesHref = `/stories/${book.genreSlug}/${book.slug}/votes`;  // Fan Contributions (votes)
    const buttonClass = "shrink-0 rounded-md bg-red-600 px-5 py-1.5 text-xs font-semibold text-white hover:bg-red-700";
    const linkClass = "group flex min-w-0 flex-1 items-center gap-3 text-sm text-gray-600 hover:text-red-600 dark:text-neutral-300";


    return (
        <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-dark-border dark:bg-dark-card">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t("impactTitle")}</h2>

            {/* Gifts: opens the gifters ranking (Top Fans) */}
            <div className="mt-3 flex items-center gap-3">
                <Gift size={22} className="shrink-0 text-amber-500" aria-hidden="true" />
                <Link href={giftsHref} className={linkClass}>
                    <span className="min-w-0 flex-1 truncate">
                        {supporters > 0 ? t("supporters", { count: supporters }) : t("beFirst")}
                    </span>

                </Link>
                <button type="button" onClick={() => setCard("gifts")} className={buttonClass}>{t("gift")}</button>
            </div>

            {/* Votes: opens the voters ranking (Fan Contributions) */}
            <div className="mt-3 flex items-center gap-3 border-t border-gray-100 pt-3 dark:border-dark-border">
                <Image src="/fang_pictures/gift-icons/ruby.png" alt="gems" width={20} height={20} />
                <Link href={votesHref} className={linkClass}>
                    <span className="truncate">{t("fanContribution")}</span>
                    {hasFans && (
                        <span className="ml-auto flex items-center">
                            {summary!.top.map((fan, i) => <Face key={i} name={fan.name} src={fan.avatar} />)}
                        </span>
                    )}
                </Link>
                <button type="button" onClick={() => setCard("ruby")} className={buttonClass}>{t("vote")}</button>
            </div>

            {card && (
                <GiftCard
                    title={book.title}
                    image={book.image}
                    book={book.slug}
                    initial={card}
                    onClose={() => { setCard(null); load(); }}
                />
            )}
        </section>
    );
}