"use client"

import { GenreCard } from "@/components/cards/two-column-cards/genre-card";
import Footer from "@/components/footer";
import { Bone } from "@/components/skeleton";
import { fetchStories } from "@/lib/fetch-stories";
import { languageForLocale } from "@/lib/language";
import type { StoryCard } from "@/lib/stories";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

const ALL = ""; // no genre picked = all books

// Same shape as a GenreCard: cover on the left, text on the right
function GenreCardSkeleton() {
    return (
        <div className="flex flex-row gap-3 sm:gap-6 p-3 sm:p-4 rounded-2xl border-2 border-gray-100 dark:border-dark-border">
            <Bone className="w-24 sm:w-28 md:w-32 aspect-3/4 shrink-0 self-start rounded-lg" />
            <div className="flex-1 space-y-2.5 pt-1">
                <Bone className="h-5 sm:h-6 w-3/4" />
                <Bone className="h-3 w-1/2" />
                <Bone className="h-3 w-full" />
                <Bone className="h-3 w-full" />
                <Bone className="h-3 w-2/3 hidden sm:block" />
                <div className="flex gap-1.5 pt-1">
                    <Bone className="h-4 w-14" />
                    <Bone className="h-4 w-12" />
                    <Bone className="h-4 w-16" />
                </div>
            </div>
        </div>
    );
}

const GenreBrowser = () => {
    const searchParams = useSearchParams();
    const selected = searchParams.get("genre") ?? ALL;
    const t = useTranslations("Stories");
    // The language the reader picked on the site: only books in it
    const language = languageForLocale(useLocale());

    const [genres, setGenres] = useState<{ name: string; slug: string }[]>([]);
    const [books, setBooks] = useState<StoryCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    const cache = useRef(new Map<string, StoryCard[]>()); // books per genre + language already loaded
    const latest = useRef(""); // the genre + language whose books should be on screen

    // Genre pills from the admin's Genre curation, for the reader's language
    useEffect(() => {
        let alive = true;
        fetch(`/api/genres?language=${encodeURIComponent(language)}`)
            .then((res) => res.json())
            .then((res) => { if (alive) setGenres(res.data ?? []); })
            .catch((error) => console.log(error));
        return () => { alive = false; };
    }, [language]);

    // Books for the picked genre in the reader's language (from the cache if already loaded)
    useEffect(() => {
        const key = `${language}|${selected}`;
        latest.current = key;

        const cached = cache.current.get(key);
        if (cached) {
            setBooks(cached);
            setLoading(false);
            setFailed(false);
            return;
        }

        const load = async () => {
            setLoading(true);
            setFailed(false);
            try {
                // A genre = the admin's curated list for it, in the admin's order. "All" = every book, newest first.
                const data = await fetchStories(
                    selected
                        ? { genre: selected, language, curated: true, limit: 100 }
                        : { language, curated: true, limit: 500 }
                );
                cache.current.set(key, data);
                if (latest.current === key) setBooks(data); // ignore answers for a genre / language no longer picked
            } catch (error) {
                console.log(error);
                if (latest.current === key) setFailed(true);
            } finally {
                if (latest.current === key) setLoading(false);
            }
        };

        load();
    }, [selected, language]);

    // Switch genre on this page: only the address changes (?genre=...), no navigation
    const pick = (slug: string) => {
        if (slug === selected) return;
        const url = new URL(window.location.href);
        if (slug) url.searchParams.set("genre", slug);
        else url.searchParams.delete("genre");
        window.history.pushState(null, "", url.toString());
    };

    const genreClass = (on: boolean) =>
        `transition cursor-pointer ${on ? "text-red-600 font-semibold" : "text-gray-400 dark:text-neutral-500 hover:text-red-600"}`;

    return (
        <div className="bg-gray-50 dark:bg-dark min-h-screen">
            <div className="relative w-[90%] mx-auto pb-12">

                <h1 className="text-3xl font-bold mt-8 text-black dark:text-white">
                    {t("genres")}
                </h1>

                {/* Phones: one line, scrolls sideways and runs to the screen edge. Bigger screens: wraps */}
                <div className="flex gap-8 my-6 overflow-x-auto no-scrollbar max-md:-mx-[5.56%] max-md:px-[5.56%] md:flex-wrap md:overflow-visible">
                    <button type="button" onClick={() => pick(ALL)} className={`shrink-0 whitespace-nowrap ${genreClass(selected === ALL)}`}>
                        {t("all")}
                    </button>
                    {genres.map((genre) => (
                        <button
                            key={genre.slug}
                            type="button"
                            onClick={() => pick(genre.slug)}
                            className={`shrink-0 whitespace-nowrap ${genreClass(selected === genre.slug)}`}>
                            {genre.name}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {Array.from({ length: 6 }, (_, i) => <GenreCardSkeleton key={i} />)}
                    </div>
                ) : failed ? (
                    <p className="py-16 text-center text-sm text-gray-500 dark:text-neutral-400">
                        {t("loadFailed")}
                    </p>
                ) : books.length === 0 ? (
                    <p className="py-16 text-center text-sm text-gray-500 dark:text-neutral-400">
                        {t("emptyGenre")}
                    </p>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            {books.map((item) => (
                                <GenreCard key={item.id} {...item} />
                            ))}
                        </div>
                        {/* TEMPORARY: more of the same books in a random order as the reader scrolls */}
                        {/* <FillerBooks books={books} /> */}
                    </>
                )}
            </div>
            <Footer />
        </div>
    );
}

// useSearchParams needs a Suspense boundary in Next 16
const Genre = () => (
    <Suspense fallback={<div className="bg-gray-50 dark:bg-dark min-h-screen" />}>
        <GenreBrowser />
    </Suspense>
);

export default Genre;