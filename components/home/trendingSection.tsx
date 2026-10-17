// // app/components/home/trendingSection.tsx
// Top Trending: the #1 book large on the left, the next three as numbered rows on the right
import Link from "next/link";
import type { HomeCollection } from "@/lib/home";
import { BookPills, Cover, SectionHeader, bookHref, formatCount } from "./bookBits";

export default function TrendingSection({ collection }: { collection: HomeCollection }) {
    const [top, ...rest] = collection.books;
    if (!top) return null;
    const others = rest.slice(0, 3);

    return (
        <section>
            <SectionHeader title={collection.name} href={`/collections/${collection.id}`} />
            {/* Both columns stretch to the same height, so neither side leaves empty space below */}
            <div className="grid items-stretch gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                {/* #1 */}
                <Link
                    href={bookHref(top)}
                    className="group flex h-full flex-col rounded-xl bg-white p-5 shadow-sm dark:bg-dark-card dark:shadow-none"
                >
                    <Cover book={top} className="mx-auto aspect-3/4 w-full max-w-[200px]" />
                    <p className="mt-5 text-[10px] font-bold uppercase tracking-wide text-red-600 dark:text-red-400">#1 This Week</p>
                    <h3 className="mt-1 line-clamp-2 text-lg font-bold text-gray-900 dark:text-white">{top.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-neutral-400">by {top.author}</p>
                    {top.blurb && <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-gray-600 dark:text-neutral-300">{top.blurb}</p>}
                    <div className="mt-3">
                        <BookPills book={top} max={3} />
                    </div>
                </Link>

                {/* #2 to #4: the rows share the column's height evenly */}
                <div className="flex h-full flex-col gap-4">
                    {others.map((book, i) => (
                        <Link
                            key={book.id}
                            href={bookHref(book)}
                            className="group flex flex-1 items-center gap-4 rounded-xl bg-white p-4 shadow-sm dark:bg-dark-card dark:shadow-none"
                        >
                            <span
                                className={`w-10 shrink-0 text-center text-3xl font-extrabold ${i === 0 ? "text-red-600 dark:text-red-500" : "text-gray-300 dark:text-neutral-600"
                                    }`}
                            >
                                {String(i + 2).padStart(2, "0")}
                            </span>
                            <Cover book={book} className="aspect-3/4 w-16 shrink-0" />
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