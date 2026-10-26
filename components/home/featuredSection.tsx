"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import type { HomeBook, HomeCollection } from "@/lib/home";
import { useTranslations } from "next-intl";
import { BookPills, Cover, OptionName, Rating, SectionHeader, bookHref, formatCount } from "./bookBits";

const ROTATE_EVERY = 6000;
// Each new book fades in
const FADE_CSS = "@keyframes fangFeaturedFade { from { opacity: 0 } to { opacity: 1 } }";
const GRID_SIZE = 8;
// Phones scroll through this many books; bigger screens show all of GRID_SIZE
const PHONE_COUNT = 6;

function FeaturedCard({ books }: { books: HomeBook[] }) {
    const t = useTranslations("Books");
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        if (paused || books.length < 2) return;
        // People who asked their device for less motion get no automatic turns (the dots still work)
        if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
        const timer = setInterval(() => setIndex((i) => (i + 1) % books.length), ROTATE_EVERY);
        return () => clearInterval(timer);
    }, [paused, books.length]);

    const book = books[index % books.length];
    if (!book) return null;

    return (
        <div
            className="flex h-full flex-col rounded-xl bg-gray-50 p-4 md:p-6 dark:bg-dark-card"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}>
            <style>{FADE_CSS}</style>
            {/* key = the book: each turn fades in. Phones: cover left, text right. Large screens: cover on top */}
            <Link key={book.id} href={bookHref(book)} className="group flex flex-1 flex-row gap-4 animate-[fangFeaturedFade_500ms_ease-out] lg:flex-col lg:gap-0">
                <div className="shrink-0 lg:flex lg:flex-1 lg:items-center lg:justify-center lg:py-6">
                    <Cover book={book} imprint="lg" className="aspect-3/4 w-28 shadow-xl sm:w-36 lg:w-[62%]" />
                </div>
                <div className="min-w-0 flex-1 lg:flex-none">
                    <h3 className="line-clamp-2 text-base font-bold text-gray-900 dark:text-white lg:mt-4 lg:text-lg">{book.title}</h3>
                    <p className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-neutral-400">
                        <span className="truncate">{t("byAuthor", { author: book.author })}</span>
                        <Rating book={book} className="shrink-0" />
                    </p>
                    {book.blurb && (
                        <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-gray-600 dark:text-neutral-300 sm:text-sm lg:mt-3">{book.blurb}</p>
                    )}
                    <div className="mt-3 lg:mt-4">
                        <BookPills book={book} max={3} />
                    </div>
                </div>
            </Link>
        </div>
    );
}

function GridCard({ book, className = "" }: { book: HomeBook; className?: string }) {
    const t = useTranslations("Books");
    return (
        <Link href={bookHref(book)} className={`group block min-w-0 ${className}`}>
            <Cover book={book} imprint="sm" className="aspect-3/4 w-full" />
            <h3 className="mt-2 line-clamp-2 min-h-8 text-xs font-semibold text-gray-900 dark:text-white sm:line-clamp-1 sm:min-h-0 sm:text-sm">{book.title}</h3>
            <div className="mt-1 flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                <span className="truncate text-xs text-gray-500 dark:text-neutral-400">{book.author}</span>
                {book.genre && (
                    <span className="max-w-full shrink-0 self-start truncate rounded-full border border-red-500 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400 sm:max-w-[55%] sm:self-auto">
                        <OptionName name={book.genre} />
                    </span>
                )}
            </div>
            <p className="mt-1.5 flex items-center gap-3 text-[11px] text-gray-500 dark:text-neutral-400">
                <span className="inline-flex items-center gap-1"><Eye size={12} /> {t("viewsCount", { views: formatCount(book.views) })}</span>
                <Rating book={book} />
            </p>
        </Link>
    );
}

export default function FeaturedSection({ collection }: { collection: HomeCollection }) {
    const grid = collection.books.slice(0, GRID_SIZE);
    return (
        <section>
            <SectionHeader title={collection.name} href={`/collections/${collection.id}`} />
            <div className="flex flex-col gap-6 lg:flex-row">
                <div className="lg:w-[32%] lg:shrink-0">
                    <FeaturedCard books={collection.books} />
                </div>
                {/* Phones: a sideways-scrolling row of the first 6 books; bigger screens: the grid */}
                <div className="flex min-w-0 flex-1 snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 scrollbar-width:none [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-3 sm:gap-y-6 sm:overflow-visible sm:pb-0 lg:grid-cols-4">
                    {grid.map((book, i) => (
                        <GridCard key={book.id} book={book} className={`w-[30%] shrink-0 snap-start sm:w-auto sm:shrink ${i >= PHONE_COUNT ? "hidden sm:block" : ""}`} />
                    ))}
                </div>
            </div>
        </section>
    );
}