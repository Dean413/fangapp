"use client"

import { GenreCard } from "@/components/cards/two-column-cards/genre-card";
import Footer from "@/components/footer";
import type { StoryCard } from "@/lib/stories";
import { useTranslations } from "next-intl";
import Link from "next/link";

type Genre = { name: string; slug: string };
type Props = {
    genres: Genre[];
    books: StoryCard[] | null;   // null = the list couldn't be loaded
    selected: string;            // genre slug, "" = all books
};

export default function GenreBrowser({ genres, books, selected }: Props) {
    const t = useTranslations("Stories");

    const genreClass = (on: boolean) =>
        `transition ${on ? "text-red-600 font-semibold" : "text-gray-400 dark:text-neutral-500 hover:text-red-600"}`;

    return (
        <div className="bg-gray-50 dark:bg-dark min-h-screen">
            <div className="relative w-[90%] mx-auto pb-12">

                <h1 className="text-3xl font-bold mt-8 text-black dark:text-white">
                    {t("genres")}
                </h1>

                {/* Phones: one line, scrolls sideways and runs to the screen edge. Bigger screens: wraps */}
                <div className="flex gap-8 my-6 overflow-x-auto no-scrollbar max-md:-mx-[5.56%] max-md:px-[5.56%] md:flex-wrap md:overflow-visible">
                    <Link href="/genre" className={`shrink-0 whitespace-nowrap ${genreClass(selected === "")}`}>
                        {t("all")}
                    </Link>
                    {genres.map((genre) => (
                        <Link
                            key={genre.slug}
                            href={`/genre/${genre.slug}`}
                            className={`shrink-0 whitespace-nowrap ${genreClass(selected === genre.slug)}`}
                        >
                            {genre.name}
                        </Link>
                    ))}
                </div>

                {books === null ? (
                    <p className="py-16 text-center text-sm text-gray-500 dark:text-neutral-400">
                        {t("loadFailed")}
                    </p>
                ) : books.length === 0 ? (
                    <p className="py-16 text-center text-sm text-gray-500 dark:text-neutral-400">
                        {t("emptyGenre")}
                    </p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {books.map((item) => (
                            <GenreCard key={item.id} {...item} />
                        ))}
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
}