// app/components/home/bookShelf.tsx
// A row of covers: Editor's Picks, Fang Originals and every other Home collection.
// Phones: the first 3 books in a fixed row, no scrolling ("View all" has the rest).
// Bigger screens: every book in the collection in a sideways-scrolling row (6 fit across on a desktop).
import Link from "next/link";
import { Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import type { HomeCollection } from "@/lib/home";
import { BookPills, Cover, SectionHeader, bookHref, formatCount } from "./bookBits";
import Imprint from "../imprint";

// How many books phones show
const PHONE_COUNT = 3;

export default function BookShelf({ collection }: { collection: HomeCollection }) {
    const t = useTranslations("Books");
    return (
        <section>
            <SectionHeader title={collection.name} href={`/collections/${collection.id}`} />
            <div className="grid grid-cols-3 gap-3 sm:-mx-1 sm:flex sm:snap-x sm:snap-mandatory sm:gap-4 sm:overflow-x-auto sm:scroll-smooth sm:px-1 sm:pb-2 sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden">
                {collection.books.map((book, i) => (
                    <Link
                        key={book.id}
                        href={bookHref(book)}
                        className={`group block min-w-0 sm:w-40 sm:shrink-0 sm:snap-start lg:w-[calc((100%-5rem)/6)] ${i >= PHONE_COUNT ? "hidden sm:block" : ""}`}>
                        <div className="relative">
                            <Cover book={book} className="aspect-3/4 w-full" />
                            <Imprint />
                        </div>
                        <h3 className="mt-2 line-clamp-1 text-sm font-semibold text-gray-900 dark:text-white">{book.title}</h3>
                        {book.author && (<p className="mt-0.5 line-clamp-1 text-xs text-gray-500 dark:text-neutral-400">{book.author}</p>)}
                        <div className="mt-1.5">
                            <BookPills book={book} />
                        </div>
                        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-gray-500 dark:text-neutral-400">
                            <Eye size={12} /> {t("viewsCount", { views: formatCount(book.views) })}
                        </p>
                    </Link>
                ))}
            </div>
        </section>
    );
}