"use client";

// app/components/home/youMayLikeSection.tsx
// The "You May Like" Home collection (from the admin's curation): 9 books as small cards in a 3 x 3 grid,
// with Hot (most viewed), Leading (best rated) and New (newest) tabs over the collection's books.
import { useMemo, useState } from "react";
import Link from "next/link";
import type { HomeBook, HomeCollection } from "@/lib/home";
import { bookHref } from "./bookBits";
import { useTranslations } from "next-intl";

type Sort = "hot" | "leading" | "new";

const SHOWN = 9;
const FALLBACK_COVER = "/fang_pictures/bookFace.png";
// Labels: Books.sort_<value>
const TABS: Sort[] = ["hot", "leading", "new"];

const time = (b: HomeBook) => (b.createdAt ? new Date(b.createdAt).getTime() : 0);

function sortBooks(books: HomeBook[], sort: Sort) {
    const list = [...books];
    if (sort === "hot") list.sort((a, b) => b.views - a.views);
    if (sort === "leading") list.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || b.views - a.views);
    if (sort === "new") list.sort((a, b) => time(b) - time(a));
    return list.slice(0, SHOWN);
}

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
    const [tab, setTab] = useState<Sort>("hot");
    const t = useTranslations("Books");
    const books = useMemo(() => sortBooks(collection.books, tab), [collection.books, tab]);

    return (
        <section>
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{collection.name}</h2>
                    <span className="mt-1 block h-0.5 w-8 rounded bg-red-600 dark:bg-red-500" />
                </div>
                <div role="tablist" aria-label={t("sort")} className="flex items-center gap-5 md:gap-8 text-xs md:text-sm">
                    {TABS.map((value) => (
                        <button
                            key={value}
                            type="button"
                            role="tab"
                            aria-selected={tab === value}
                            onClick={() => setTab(value)}
                            className={`border-b-2 pb-1 transition ${tab === value
                                ? "border-red-600 font-medium text-red-600"
                                : "border-transparent text-gray-500 hover:text-gray-900 dark:text-neutral-400 dark:hover:text-white"}`}>
                            {t(`sort_${value}`)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
                {books.map((b) => <BookCard key={b.id} book={b} />)}
            </div>
        </section>
    );
}