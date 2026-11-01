"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Crown, Heart, Medal } from "lucide-react";
import Footer from "@/components/footer";
import GiftCard from "@/components/book-controls/gift";
import type { Fan, FanBoard } from "@/lib/fan";

type Props = {
    kind: "gifts" | "votes";               // gifts = Top Fans, votes = Fan Contributions
    book: { slug: string; title: string; genreSlug: string; image: string };
    tab: "monthly" | "overall";            // only the votes page has tabs
    board: FanBoard | null;                // null = the list couldn't be loaded
};

// Phones: No. 1 on its own row, No. 2 and No. 3 side by side. Bigger screens: 2, 1, 3 in one row
const POSITION = ["col-span-2 md:col-span-1 md:order-2", "md:order-1", "md:order-3"];

// The reader's photo, or their initials when there is none (or it fails to load)
function Avatar({ name, src, className }: { name: string; src: string | null; className: string }) {
    const [failed, setFailed] = useState(false);
    const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("") || "?";
    return (
        <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 font-semibold text-gray-600 dark:bg-dark-raised dark:text-neutral-300 ${className}`}>
            {src && !failed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={name} onError={() => setFailed(true)} className="h-full w-full object-cover" />
            ) : initials}
        </span>
    );
}

export default function FansView({ kind, book, tab, board }: Props) {
    const t = useTranslations("Fans");
    const b = useTranslations("Book");
    const locale = useLocale();
    const router = useRouter();
    const [cardOpen, setCardOpen] = useState(false);

    const isVotes = kind === "votes";
    const n = (value: number) => new Intl.NumberFormat(locale).format(value);
    const top = board?.fans.slice(0, 3) ?? [];
    const rest = board?.fans.slice(3) ?? [];
    const me = board?.me ?? { rank: null, points: 0 };
    const bookPath = `/stories/${book.genreSlug}/${book.slug}`;

    // What the points are called on this page
    const unit = isVotes ? t("points") : t("giftValue");
    const column = isVotes ? t("rubyContribution") : t("giftValue");
    const pageTitle = isVotes ? t("title") : t("topFansTitle");
    const pageSubtitle = isVotes ? t("subtitle") : t("topFansSubtitle");
    const crown = isVotes && tab === "monthly" ? t("numberOneMonthly") : t("numberOneOverall");

    // Phones: two equal tabs across the page. Bigger screens: side by side on the left. The active one is underlined.
    const tabClass = (on: boolean) =>
        `-mb-px border-b-2 pb-2 text-center text-sm transition ${on
            ? "border-red-600 font-semibold text-red-600"
            : "border-transparent text-gray-500 hover:text-red-600 dark:text-neutral-400"}`;

    const topCard = (fan: Fan, i: number) => {
        const first = i === 0;
        return (
            <div
                key={fan.rank}
                className={`${POSITION[i]} flex flex-col rounded-2xl border p-4 md:p-6 ${first ? "items-start md:items-center" : "items-center"} ${first
                    ? "border-red-100 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10"
                    : "border-gray-100 bg-white dark:border-dark-border dark:bg-dark-card"} ${fan.you ? "ring-2 ring-red-500/40" : ""}`}>
                <p className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide ${first ? "text-red-600" : "text-gray-500 dark:text-neutral-400"}`}>
                    {first ? <Crown size={14} aria-hidden="true" /> : <Medal size={14} aria-hidden="true" />}
                    {first ? crown : t("place", { rank: fan.rank })}
                </p>

                {/* No. 1 on a phone: photo on the left, name and points on the right */}
                <div className={first
                    ? "mt-3 flex w-full items-center gap-4 md:flex-col md:gap-0 md:text-center"
                    : "flex w-full flex-col items-center text-center"}>
                    <Avatar
                        name={fan.name ?? ""}
                        src={fan.avatar}
                        className={first ? "h-16 w-16 text-lg ring-2 ring-white md:mt-3 md:h-20 md:w-20 md:text-xl dark:ring-dark" : "mt-3 h-14 w-14 text-base"}
                    />
                    <div className={first ? "min-w-0 flex-1 md:w-full md:flex-none" : "w-full"}>
                        <p className={`${first ? "md:mt-3" : "mt-3"} w-full truncate text-sm font-bold text-gray-900 dark:text-white md:text-base`}>
                            {fan.name ?? t("anonymous")}
                        </p>
                        <p className={`mt-1 font-bold ${first ? "text-3xl text-red-600" : "text-xl text-gray-900 dark:text-white"}`}>{n(fan.points)}</p>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-neutral-500">{unit}</p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark">
            <div className="mx-auto w-[90%] max-w-6xl pb-12 pt-6">
                <nav className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-500 dark:text-neutral-400">
                    <Link href="/" className="hover:text-red-600">{b("home")}</Link>
                    <span>/</span>
                    <Link href={bookPath} className="max-w-[40%] truncate hover:text-red-600">{book.title}</Link>
                    <span>/</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{pageTitle}</span>
                </nav>

                <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">{pageTitle}</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">{pageSubtitle}</p>

                {isVotes && (
                    <div className="mt-5 grid grid-cols-2 border-b border-gray-200 md:flex md:gap-6 md:border-b-0 dark:border-dark-border">
                        <Link href="?tab=monthly" replace scroll={false} className={tabClass(tab === "monthly")}>{t("monthly")}</Link>
                        <Link href="?tab=overall" replace scroll={false} className={tabClass(tab === "overall")}>{t("overall")}</Link>
                    </div>
                )}

                {board === null ? (
                    <p className="py-16 text-center text-sm text-gray-500 dark:text-neutral-400">{t("loadFailed")}</p>
                ) : (
                    <>
                        {top.length > 0 && (
                            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
                                {top.map(topCard)}
                            </div>
                        )}

                        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
                            <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-dark-border dark:bg-dark-card">
                                {top.length === 0 ? (
                                    <p className="px-4 py-12 text-center text-sm text-gray-500 dark:text-neutral-400">{isVotes ? t("noVotesYet") : t("empty")}</p>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3 px-4 py-3 text-[10px] uppercase tracking-wide text-gray-400 dark:text-neutral-500">
                                            <span className="w-8">{t("rank")}</span>
                                            <span className="flex-1">{t("fan")}</span>
                                            <span>{column}</span>
                                        </div>
                                        {rest.map((fan) => (
                                            <div key={fan.rank} className={`flex items-center gap-3 border-t border-gray-100 px-4 py-3 dark:border-dark-border ${fan.you ? "bg-red-50/60 dark:bg-red-500/5" : ""}`}>
                                                <span className="w-8 text-sm text-gray-500 dark:text-neutral-400">{String(fan.rank).padStart(2, "0")}</span>
                                                <Avatar name={fan.name ?? ""} src={fan.avatar} className="h-8 w-8 text-[11px]" />
                                                <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-white">{fan.name ?? t("anonymous")}</span>
                                                <span className="text-sm font-bold text-gray-900 dark:text-white">{n(fan.points)}</span>
                                            </div>
                                        ))}
                                    </>
                                )}
                                {isVotes && top.length > 0 && (
                                    <p className="border-t border-gray-100 px-4 py-3 text-[11px] text-gray-400 dark:border-dark-border dark:text-neutral-500">{t("footnote")}</p>
                                )}
                            </section>

                            <aside className="space-y-4 self-start lg:sticky lg:top-24">
                                <section className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-dark-border dark:bg-dark-card">
                                    <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                                        <Heart size={18} className="text-red-600" aria-hidden="true" />
                                        {t("yourContribution")}
                                    </h2>
                                    <div className="mt-4 flex gap-10">
                                        <div>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{me.rank ?? "—"}</p>
                                            <p className="text-xs text-gray-500 dark:text-neutral-400">{t("yourRank")}</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{n(me.points)}</p>
                                            <p className="text-xs text-gray-500 dark:text-neutral-400">{isVotes ? t("rubyContribution") : t("giftValue")}</p>
                                        </div>
                                    </div>
                                    <p className="mt-4 text-sm text-gray-600 dark:text-neutral-300">{t("yourText")}</p>
                                    <button
                                        type="button"
                                        onClick={() => setCardOpen(true)}
                                        className="mt-4 w-full rounded-full bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700">
                                        {isVotes ? t("vote") : t("giftThisStory")}
                                    </button>
                                </section>

                                {isVotes && (
                                    <section className="rounded-2xl bg-red-50 p-4 dark:bg-red-500/10">
                                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t("everyFanCounts")}</h2>
                                        <p className="mt-2 text-xs text-gray-600 dark:text-neutral-300">{t("everyFanText")}</p>
                                    </section>
                                )}
                            </aside>
                        </div>
                    </>
                )}
            </div>

            {cardOpen && (
                <GiftCard
                    title={book.title}
                    image={book.image}
                    book={book.slug}
                    initial={isVotes ? "ruby" : "gifts"}
                    onClose={() => {
                        setCardOpen(false);
                        router.refresh(); // the new gift or vote shows up in the ranking
                    }}
                />
            )}
            <Footer />
        </div>
    );
}