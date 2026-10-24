"use client";

// app/components/home/youMayLikeSection.tsx
// The "You May Like" Home collection (from the admin's curation): the first 9 books, in the admin's order,
// as small cards in a 3 x 3 grid, with a "View all" link like the other sections.
import Link from "next/link";
import type { HomeBook, HomeCollection } from "@/lib/home";
import { SectionHeader, bookHref } from "./bookBits";

const SHOWN = 9;
const FALLBACK_COVER = "/fang_pictures/bookFace.png";

function BookCard({ book }: { book: HomeBook }) {
    return (
        <Link
            href={bookHref(book)}
            className="group flex gap-3 rounded-lg bg-white p-2.5 shadow-sm transition hover:bg-gray-50 dark:bg-dark-card dark:shadow-none dark:hover:bg-dark-raised">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={book.image || FALLBACK_COVER}
                onError={(e) => { e.currentTarget.src = FALLBACK_COVER; }}
                alt={book.title}
                className="w-20 aspect-3/4 shrink-0 rounded object-cover"
            />
            <div className="min-w-0 flex-1 py-1">
                <h3 className="line-clamp-1 text-sm font-semibold text-gray-900 dark:text-white">{book.title}</h3>
                <div className="mt-1 flex min-w-0 items-center gap-1 text-xs text-gray-600 dark:text-neutral-300">
                    <span className="truncate">{book.author}</span>
                    {book.genre && (
                        <>
                            <span aria-hidden="true">.</span>
                            <span className="shrink-0 truncate max-w-[60%] rounded-full border border-red-100 bg-white px-2 py-0.5 text-[10px] font-medium text-red-600 dark:border-transparent">
                                {book.genre}
                            </span>
                        </>
                    )}
                </div>
                {book.blurb && (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-gray-600 dark:text-neutral-300">{book.blurb}</p>
                )}
                {book.rating != null && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-neutral-400">★ {book.rating.toFixed(1)}</p>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
                {books.map((b) => <BookCard key={b.id} book={b} />)}
            </div>
        </section>
    );
}