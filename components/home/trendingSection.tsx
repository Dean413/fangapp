"use client";

// app/components/home/trendingSection.tsx
// Top Trending: a big card on the left with the #1 book, and the next three as numbered rows on the right.
// On phones only three books show (#1, #2, #3); "View all" has the rest.
import Link from "next/link";
import type { HomeBook, HomeCollection } from "@/lib/home";
import { BookPills, Cover, SectionHeader, bookHref, formatCount } from "./bookBits";
import { useTranslations } from "next-intl";

function TopCard({ book }: { book: HomeBook }) {
    return (
        <div className="flex h-full flex-col rounded-xl bg-white p-5 shadow-sm dark:bg-dark-card dark:shadow-none">
            <Link href={bookHref(book)} className="group flex flex-1 flex-col">
                <Cover book={book} imprint="lg" className="mx-auto aspect-3/4 w-full max-w-50" />
                <p className="mt-5 text-[10px] font-bold uppercase tracking-wide text-red-600 dark:text-red-400">
                    #1 This Week
                </p>
                <h3 className="mt-1 line-clamp-2 text-lg font-bold text-gray-900 dark:text-white">{book.title}</h3>
                <p className="text-xs text-gray-500 dark:text-neutral-400">by {book.author}</p>
                {book.blurb && <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-gray-600 dark:text-neutral-300">{book.blurb}</p>}
                <div className="mt-3">
                    <BookPills book={book} max={3} />
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

                {/* #2 to #4: the rows share the column's height evenly (phones: #2 and #3 only) */}
                <div className="flex h-full flex-col gap-4">
                    {others.map((book, i) => (
                        <Link
                            key={book.id}
                            href={bookHref(book)}
                            className={`group ${i >= 2 ? "hidden sm:flex" : "flex"} flex-1 items-center gap-3 sm:gap-4 rounded-xl bg-white p-3 sm:p-4 shadow-sm dark:bg-dark-card dark:shadow-none`}
                        >
                            <span
                                className={`w-6 sm:w-10 shrink-0 text-center text-lg sm:text-3xl font-extrabold ${i === 0 ? "text-red-600 dark:text-red-500" : "text-gray-300 dark:text-neutral-600"
                                    }`}
                            >
                                {String(i + 2).padStart(2, "0")}
                            </span>
                            <Cover book={book} ribbons={false} imprint="sm" className="aspect-3/4 w-16 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <h4 className="line-clamp-1 text-sm font-semibold text-gray-900 dark:text-white">{book.title}</h4>
                                <p className="text-xs text-gray-500 dark:text-neutral-400">by {book.author}</p>
                                {book.blurb && <p className="mt-1.5 max-sm:hidden line-clamp-2 text-xs text-gray-600 dark:text-neutral-300">{book.blurb}</p>}
                                <div className="mt-2">
                                    <BookPills book={book} />
                                </div>
                            </div>
                            <div className="shrink-0 text-right">
                                <p className="text-base font-bold text-gray-900 dark:text-white">{formatCount(book.views)}</p>
                                <p className="text-[9px] uppercase tracking-wide text-gray-400 dark:text-neutral-500">{t("reads")}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}