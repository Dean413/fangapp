"use client";

// app/components/home/trendingSection.tsx
// Top Trending: a big card on the left that takes turns showing every book in the collection
// (a new one every 6 seconds; pauses while the pointer is on it), and the next three as numbered rows on the right
import { useEffect, useState } from "react";
import Link from "next/link";
import type { HomeBook, HomeCollection } from "@/lib/home";
import { BookPills, Cover, SectionHeader, bookHref, formatCount } from "./bookBits";

const ROTATE_EVERY = 6000;
// Each new book fades in
const FADE_CSS = "@keyframes fangTrendingFade { from { opacity: 0 } to { opacity: 1 } }";

function RotatingCard({ books }: { books: HomeBook[] }) {
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        if (paused || books.length < 2) return;
        // People who asked their device for less motion get no automatic turns
        if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
        const timer = setInterval(() => setIndex((i) => (i + 1) % books.length), ROTATE_EVERY);
        return () => clearInterval(timer);
    }, [paused, books.length]);

    const book = books[index % books.length];
    if (!book) return null;

    return (
        <div
            className="flex h-full flex-col rounded-xl bg-white p-5 shadow-sm dark:bg-dark-card dark:shadow-none"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}>
            <style>{FADE_CSS}</style>
            {/* key = the book: each turn fades in */}
            <Link key={book.id} href={bookHref(book)} className="group flex flex-1 flex-col animate-[fangTrendingFade_500ms_ease-out]">
                <Cover book={book} imprint="lg" className="mx-auto aspect-3/4 w-full max-w-50" />
                <h3 className="mt-5 line-clamp-2 text-lg font-bold text-gray-900 dark:text-white">{book.title}</h3>
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
    const [top, ...rest] = collection.books;
    if (!top) return null;
    const others = rest.slice(0, 3);

    return (
        <section>
            <SectionHeader title={collection.name} href={`/collections/${collection.id}`} />
            {/* Both columns stretch to the same height, so neither side leaves empty space below */}
            <div className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                {/* Every book in turn */}
                <RotatingCard books={collection.books} />

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
                            <Cover book={book} imprint="sm" className="aspect-3/4 w-14 sm:w-16 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <h4 className="line-clamp-1 text-sm font-semibold text-gray-900 dark:text-white">{book.title}</h4>
                                <p className="text-xs text-gray-500 dark:text-neutral-400">by {book.author}</p>
                                {book.blurb && <p className="mt-1.5 line-clamp-2 text-xs text-gray-600 dark:text-neutral-300">{book.blurb}</p>}
                                <div className="mt-2">
                                    <BookPills book={book} />
                                </div>
                            </div>
                            <div className="shrink-0 text-right">
                                <p className="text-base font-bold text-gray-900 dark:text-white">{formatCount(book.views)}</p>
                                <p className="text-[9px] uppercase tracking-wide text-gray-400 dark:text-neutral-500">Reads</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}