"use client";

// Continue Reading: the signed-in reader's most recently read books they haven't finished (up to 4), newest first.
// Shows nothing when signed out or when there's nothing to continue.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/authStore";
import { SectionHeader } from "@/components/home/bookBits";
import { useTranslations } from "next-intl";
import Imprint from "@/components/imprint";

type ContinueBook = {
    slug: string;
    title: string;
    author: string;
    image: string;
    lastChapter: number;
    totalChapters: number;
    href: string;
};

const FALLBACK_COVER = "/fang_pictures/bookFace.png";
const SHOWN = 4;
// Phones: a sideways row; bigger screens: 2 then 4 across
const CARD = "w-[80%] shrink-0 snap-start sm:w-auto";

function BookCover({ book }: { book: ContinueBook }) {
    const [failed, setFailed] = useState(false);
    return (
        <div className="relative w-20 h-28 shrink-0 overflow-hidden rounded-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={failed ? FALLBACK_COVER : book.image}
                onError={() => setFailed(true)}
                alt={book.title}
                className="w-full h-full object-cover"
            />
            <Imprint size="sm" />
        </div>
    );
}

function CardSkeleton() {
    return (
        <div className={`${CARD} flex gap-4 rounded-xl bg-white dark:bg-dark-card p-3 shadow-sm dark:shadow-none animate-pulse`}>
            <div className="w-20 h-28 shrink-0 rounded-md bg-gray-200 dark:bg-dark-raised" />
            <div className="flex-1 space-y-2 pt-2">
                <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-dark-raised" />
                <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-dark-raised" />
                <div className="h-1 w-14 rounded bg-gray-200 dark:bg-dark-raised mt-3" />
                <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-dark-raised" />
            </div>
        </div>
    );
}

// viewAllHref: where "View All" goes (the reader's library)
const ContinueReading = ({ viewAllHref = "/library" }: { viewAllHref?: string }) => {
    const userId = useAuthStore((s) => s.user?.id ?? null);
    const t = useTranslations("Reader");
    const b = useTranslations("Books");
    const [books, setBooks] = useState<ContinueBook[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setBooks([]);
        if (!userId) return;
        let cancelled = false;
        setLoading(true);
        fetch(`/api/library/continue?limit=${SHOWN}`, { credentials: "include", cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => { if (!cancelled) setBooks(Array.isArray(data?.books) ? data.books : []); })
            .catch(() => { })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [userId]);

    if (!userId || (!loading && books.length === 0)) return null;

    return (
        <section>
            <SectionHeader title={t("continueReading")} href={viewAllHref} />
            <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 scrollbar-width:none [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
                {loading
                    ? Array.from({ length: SHOWN }, (_, i) => <CardSkeleton key={i} />)
                    : books.map((book) => {
                        const percent = Math.min(100, Math.round((book.lastChapter / Math.max(1, book.totalChapters)) * 100));
                        return (
                            <Link
                                key={book.slug}
                                href={book.href}
                                className={`${CARD} group flex gap-4 rounded-xl bg-white dark:bg-dark-card p-3 shadow-sm dark:shadow-none hover:bg-gray-50 dark:hover:bg-dark-raised transition`}>
                                <BookCover book={book} />
                                <div className="min-w-0 flex-1 pt-2">
                                    <h3 className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white">{book.title}</h3>
                                    <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-neutral-400">{t("byAuthor", { author: book.author })}</p>

                                    {/* Progress */}
                                    <div className="mt-3 h-0.5 w-14 rounded-full bg-gray-200 dark:bg-neutral-700 overflow-hidden">
                                        <div className="h-full bg-red-600 rounded-full" style={{ width: `${percent}%` }} />
                                    </div>
                                    <p className="mt-1.5 text-[11px] text-gray-600 dark:text-neutral-300">
                                        {b("progress", { chapter: book.lastChapter, total: book.totalChapters, percent })}
                                    </p>

                                    <span className="mt-2 inline-block text-[11px] font-medium text-red-600 group-hover:text-red-500">
                                        {t("continueReading")}
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
            </div>
        </section>
    );
};

export default ContinueReading;