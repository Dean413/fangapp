"use client";

// app/components/home/youMayLikeSection.tsx
// The "You May Like" Home collection (from the admin's curation): the first 9 books, in the admin's order.
// Phones: 3 columns of cover cards (cover, title, author, genre + tag, rating).
// sm and up: the horizontal cards in a 2 / 3 column grid. "View all" link like the other sections.
import Link from "next/link";
import type { HomeBook, HomeCollection } from "@/lib/home";
import { useOptionNames } from "@/hooks/useOptionName";
import { SectionHeader, bookHref } from "./bookBits";
import Imprint from "../imprint";

const SHOWN = 9;
const FALLBACK_COVER = "/fang_pictures/bookFace.png";

type TaggedBook = HomeBook & { tags?: string[] };

export function BookCard({ book }: { book: HomeBook }) {
    // Genre and tag names in the site's language
    const tr = useOptionNames();
    const genre = book.genre;
    const tag = (book as TaggedBook).tags?.find((x) => x && x.toLowerCase() !== (genre ?? "").toLowerCase());

    return (
        <Link
            href={bookHref(book)}
            className="group flex min-w-0 flex-col gap-2 sm:flex-row sm:gap-3 sm:rounded-lg sm:bg-white sm:p-2.5 sm:shadow-sm sm:transition sm:hover:bg-gray-50 dark:sm:bg-dark-card dark:sm:shadow-none dark:sm:hover:bg-dark-raised">
            <div className="relative w-full aspect-3/4 shrink-0 overflow-hidden rounded-md bg-gray-100 sm:w-20 sm:self-start sm:rounded dark:bg-neutral-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={book.image || FALLBACK_COVER}
                    onError={(e) => { e.currentTarget.src = FALLBACK_COVER; }}
                    alt={book.title}
                    className="absolute inset-0 h-full w-full object-cover"
                />
                <Imprint />
            </div>
            <div className="min-w-0 flex-1 sm:py-1">
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 sm:line-clamp-1 dark:text-white">
                    {book.title}
                </h3>
                <p className="mt-1 truncate text-xs text-gray-500 dark:text-neutral-400">{book.author}</p>

                {/* Genre and tag: one line, cut with "…" */}
                {(genre || tag) && (
                    <div className="mt-1.5 flex flex-nowrap items-center gap-1.5 overflow-hidden">
                        {genre && (
                            <span className="min-w-0 shrink truncate rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-500/15 dark:text-red-300">
                                {tr(genre)}
                            </span>
                        )}
                        {tag && (
                            <span className="min-w-0 shrink truncate text-[11px] text-gray-500 dark:text-neutral-400">
                                {tr(tag)}
                            </span>
                        )}
                    </div>
                )}

                {book.blurb && (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-gray-600 max-sm:hidden dark:text-neutral-300">
                        {book.blurb}
                    </p>
                )}
                {book.rating != null && (
                    <p className="mt-1.5 text-xs text-gray-500 sm:mt-2 dark:text-neutral-400">★ {book.rating.toFixed(1)}</p>
                )}
            </div>
        </Link>
    );
}

export default function YouMayLikeSection({ collection }: { collection: HomeCollection }) {
    const books = collection.books.slice(0, SHOWN);

    return (
        <section>
            <SectionHeader title={collection.name} href={`/collections/${collection.id}`} />

            <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-2 sm:gap-3 md:gap-5 lg:grid-cols-3">
                {books.map((b) => <BookCard key={b.id} book={b} />)}
            </div>
        </section>
    );
}