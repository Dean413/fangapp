"use client"

import { GenreCard } from "@/components/cards/two-column-cards/genre-card";
import Footer from "@/components/footer";
import { Bone } from "@/components/skeleton";
import { fetchStories } from "@/lib/fetch-stories";
import type { StoryCard } from "@/lib/stories";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

const ALL = ""; // no genre picked = all books

// Same shape as a GenreCard: cover on the left, text on the right
function GenreCardSkeleton() {
    return (
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-3 sm:p-4 rounded-2xl border-2 border-gray-100 dark:border-dark-border">
            <Bone className="w-full sm:w-28 md:w-32 aspect-3/4 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2.5 pt-1">
                <Bone className="h-6 w-3/4" />
                <Bone className="h-3 w-1/2" />
                <Bone className="h-3 w-full" />
                <Bone className="h-3 w-full" />
                <Bone className="h-3 w-2/3" />
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

    const [genres, setGenres] = useState<{ name: string; slug: string }[]>([]);
    const [books, setBooks] = useState<StoryCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    const cache = useRef(new Map<string, StoryCard[]>()); // books per genre already loaded
    const latest = useRef(""); // the genre whose books should be on screen

    // Genre list, once
    useEffect(() => {
        fetch("/api/genres")
            .then((res) => res.json())
            .then((res) => setGenres(res.data ?? []))
            .catch((error) => console.log(error));
    }, []);

    // Books for the picked genre (from the cache if already loaded)
    useEffect(() => {
        latest.current = selected;

        const cached = cache.current.get(selected);
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
                // "All" leaves genre out
                const data = await fetchStories(
                    selected ? { genre: selected, sort: "new", limit: 60 } : { sort: "new", limit: 60 }
                );
                cache.current.set(selected, data);
                if (latest.current === selected) setBooks(data); // ignore answers for a genre no longer picked
            } catch (error) {
                console.log(error);
                if (latest.current === selected) setFailed(true);
            } finally {
                if (latest.current === selected) setLoading(false);
            }
        };

        load();
    }, [selected]);

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
                    Stories
                </h1>

                <div className="flex gap-8 my-6 flex-wrap">
                    <button type="button" onClick={() => pick(ALL)} className={genreClass(selected === ALL)}>
                        All
                    </button>
                    {genres.map((genre) => (
                        <button
                            key={genre.slug}
                            type="button"
                            onClick={() => pick(genre.slug)}
                            className={genreClass(selected === genre.slug)}
                        >
                            {genre.name}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Array.from({ length: 6 }, (_, i) => <GenreCardSkeleton key={i} />)}
                    </div>
                ) : failed ? (
                    <p className="py-16 text-center text-sm text-gray-500 dark:text-neutral-400">
                        Couldn&apos;t load these books. Please try again.
                    </p>
                ) : books.length === 0 ? (
                    <p className="py-16 text-center text-sm text-gray-500 dark:text-neutral-400">
                        No books in this genre yet.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {books.map((item) => (
                            <GenreCard key={item.id} {...item} />
                        ))}
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
};

// useSearchParams needs a Suspense boundary in Next 16
const Genre = () => (
    <Suspense fallback={<div className="bg-gray-50 dark:bg-dark min-h-screen" />}>
        <GenreBrowser />
    </Suspense>
);

export default Genre;