// components/author/author-book-row.tsx
// One of the author's books on their page: cover, title, genre and tags, rating, summary, status and views.
import { Star } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import type { AuthorBook } from "@/lib/authors";
import AuthorBookCover from "./bookCover";

const STARS = [0, 1, 2, 3, 4];

// Five stars, filled up to the rating (halves and quarters too)
function Stars({ value }: { value: number }) {
    const row = (className: string) => (
        <span className={`flex ${className}`}>
            {STARS.map((i) => <Star key={i} size={16} fill="currentColor" strokeWidth={0} className="shrink-0" />)}
        </span>
    );
    return (
        <span className="relative inline-flex" aria-hidden="true">
            {row("text-gray-300 dark:text-neutral-600")}
            <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${Math.min(Math.max(value / 5, 0), 1) * 100}%` }}>
                {row("text-yellow-400")}
            </span>
        </span>
    );
}

export default async function AuthorBookRow({ book }: { book: AuthorBook }) {
    const [a, b, t, locale] = await Promise.all([
        getTranslations("Author"),
        getTranslations("Books"),
        getTranslations("Book"),
        getLocale(),
    ]);

    // Genre first, then the tags (no repeats)
    const pills = [book.genre, ...book.tags]
        .filter((p, i, all) => p && all.findIndex((x) => x?.toLowerCase() === p.toLowerCase()) === i)
        .slice(0, 4);
    const completed = book.status === "COMPLETED";
    const views = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(book.views);

    return (
        <Link
            href={book.href}
            className="flex gap-4 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:bg-gray-50 dark:border-transparent dark:bg-dark-card dark:shadow-none dark:hover:bg-dark-raised">
            <AuthorBookCover src={book.image} alt={book.title} />

            <div className="min-w-0 flex-1">
                <h2 className="line-clamp-1 font-serif text-base font-bold text-gray-900 dark:text-white">{book.title}</h2>

                {pills.length > 0 && (
                    <div className="mt-1 flex min-w-0 flex-wrap gap-x-3 gap-y-0.5">
                        {pills.map((p, i) => (
                            <span key={p} className={`max-w-full truncate text-[11px] ${i === 0 && book.genre ? "font-semibold text-red-600 dark:text-red-400" : "text-gray-600 dark:text-neutral-300"}`}>
                                {p}
                            </span>
                        ))}
                    </div>
                )}

                {book.rating != null && (
                    <div className="mt-2 flex items-center gap-2">
                        <Stars value={book.rating} />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{a("ratingOutOf", { rating: book.rating.toFixed(1) })}</span>
                    </div>
                )}

                {book.summary && (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-600 dark:text-neutral-300">{book.summary}</p>
                )}

                <p className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-neutral-400">
                    <span>{completed ? b("completed") : b("ongoing")}</span>
                    <span>{t("views", { views })}</span>
                </p>
            </div>
        </Link>
    );
}