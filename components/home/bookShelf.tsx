// app/components/home/bookShelf.tsx
// A sideways-scrolling row of covers: Editor's Picks, Fang Originals and every other Home collection.
// Shows every book in the collection; 6 fit across on a desktop, the rest scroll into view.
import Link from "next/link";
import { Eye } from "lucide-react";
import type { HomeCollection } from "@/lib/home";
import { BookPills, Cover, SectionHeader, bookHref, formatCount } from "./bookBits";

export default function BookShelf({ collection }: { collection: HomeCollection }) {
    return (
        <section>
            <SectionHeader title={collection.name} href={`/collections/${collection.id}`} />
            <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {collection.books.map((book) => (
                    <Link
                        key={book.id}
                        href={bookHref(book)}
                        className="group block w-36 shrink-0 snap-start sm:w-40 lg:w-[calc((100%-5rem)/6)]">
                        <Cover book={book} className="aspect-3/4 w-full" />
                        <h3 className="mt-2 line-clamp-1 text-sm font-semibold text-gray-900 dark:text-white">{book.title}</h3>
                        <p className="mt-0.5 line-clamp-1 text-xs text-gray-500 dark:text-neutral-400">{book.author}</p>
                        <div className="mt-1.5">
                            <BookPills book={book} />
                        </div>
                        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-gray-500 dark:text-neutral-400">
                            <Eye size={12} /> {formatCount(book.views)} views
                        </p>
                    </Link>
                ))}
            </div>
        </section>
    );
}