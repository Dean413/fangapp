"use client";

// app/components/home/trendingSection.tsx
// Top Trending: a big card with the #1 book, and the next three as numbered rows.
// Phones: the #1 card is cover-left / text-right, with the three rows under it. Bigger screens: #1 on the left, rows on the right.
import Link from "next/link";
import type { HomeBook, HomeCollection } from "@/lib/home";
import { Cover, SectionHeader, bookHref, formatCount } from "./bookBits";
import { BookPills } from "@/components/home/bookPill";
import { useTranslations } from "next-intl";

function TopCard({ book }: { book: HomeBook }) {
    const t = useTranslations("Books");
    return (
        <div className="flex h-full flex-col rounded-xl bg-white p-4 shadow-sm md:p-5 dark:bg-dark-card dark:shadow-none">
            <Link href={bookHref(book)} className="group flex flex-1 flex-row gap-4 md:flex-col md:gap-0">
                <Cover book={book} imprint="lg" className="aspect-3/4 w-28 shrink-0 sm:w-36 md:mx-auto md:w-full md:max-w-50" />
                <div className="min-w-0 flex-1 md:flex-none">
                    <p className="hidden text-[10px] font-bold uppercase tracking-wide text-red-600 md:mt-5 md:block dark:text-red-400">
                        {t("topThisWeek")}
                    </p>
                    <h3 className="line-clamp-2 text-base font-bold text-gray-900 md:mt-1 md:text-lg dark:text-white">{book.title}</h3>
                    <p className="mt-1 line-clamp-1 text-xs text-gray-500 md:mt-0 dark:text-neutral-400">{t("byAuthor", { author: book.author })}</p>
                    {book.blurb && (
                        <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-gray-600 md:mt-3 md:line-clamp-3 dark:text-neutral-300">{book.blurb}</p>
                    )}
                    <div className="mt-3">
                        <BookPills book={book} max={3} />
                    </div>
                </div>
            </Link>
        </div>
    );
}

export default function TrendingSection({ collection }: { collection: HomeCollection }) {
    const t = useTranslations("Books");
    const [top, ...rest] = collection.books;
    if (!top) return null;
    const others = rest.slice(0, 3);

    return (
        <section>
            <SectionHeader title={collection.name} href={`/collections/${collection.id}`} />
            {/* Both columns stretch to the same height, so neither side leaves empty space below */}
            <div className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <TopCard book={top} />

                {/* #2 to #4: the rows share the column's height evenly */}
                <div className="flex h-full flex-col gap-4">
                    {others.map((book, i) => (
                        <Link
                            key={book.id}
                            href={bookHref(book)}
                            className="group flex flex-1 items-center gap-3 sm:gap-4 rounded-xl bg-white p-3 sm:p-4 shadow-sm dark:bg-dark-card dark:shadow-none"
                        >
                            <span
                                className={`w-8 sm:w-10 shrink-0 text-center text-2xl sm:text-3xl font-extrabold ${i === 0 ? "text-red-600 dark:text-red-500" : "text-gray-300 dark:text-neutral-600"
                                    }`}
                            >
                                {String(i + 2).padStart(2, "0")}
                            </span>
                            <Cover book={book} imprint="sm" className="aspect-3/4 w-12 shrink-0 sm:w-16" />
                            <div className="min-w-0 flex-1">
                                <h4 className="line-clamp-1 text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{book.title}</h4>
                                <p className="line-clamp-1 text-[10px] sm:text-xs text-gray-500 dark:text-neutral-400">{t("byAuthor", { author: book.author })}</p>
                                {book.blurb && <p className="mt-1 line-clamp-2 text-[10px] sm:mt-1.5 sm:text-xs text-gray-600 dark:text-neutral-300">{book.blurb}</p>}
                                <div className="mt-1.5 sm:mt-2">
                                    <BookPills book={book} />
                                </div>
                            </div>
                            <div className="shrink-0 text-right">
                                <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">{formatCount(book.views)}</p>
                                <p className="text-[8px] sm:text-[9px] uppercase tracking-wide text-gray-400 dark:text-neutral-500">{t("reads")}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}