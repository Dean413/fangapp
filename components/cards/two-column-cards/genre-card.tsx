"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CoverPlaceholder } from "@/components/skeleton";

const FALLBACK_COVER = "/fang_pictures/bookFace.png";

interface cardDataProps {
    title: string;
    slug: string;
    genreSlug?: string;
    author: string;
    views: string;
    genre?: string;
    tags: string[] | string;
    image: string;
    summary?: string;
    status: string;
    chapter: number;
}

const TAG_COLORS = [
    "bg-red-100 text-red-500 dark:bg-red-500/15 dark:text-red-300",
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    "bg-pink-100 text-pink-400 dark:bg-pink-500/15 dark:text-pink-300",
    "bg-green-100 text-green-400 dark:bg-green-500/15 dark:text-green-300",
];

export const GenreCard = (genreCard: cardDataProps) => {
    const { image, title, slug, genreSlug, author, tags, chapter, summary, status, views } = genreCard;
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [image]);

    const completed = String(status).toUpperCase() === "COMPLETED";
    const tagList = (Array.isArray(tags) ? tags : [tags]).filter(Boolean);

    return (
        <Link
            href={`/stories/${genreSlug || "all"}/${slug}`}
            className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-3 sm:p-4 rounded-2xl border-2 border-gray-100 dark:border-dark-border transition hover:border-gray-200 hover:shadow-sm dark:hover:border-neutral-700">
            {/* Image */}
            <div className="w-full sm:w-28 md:w-32 aspect-3/4 relative shrink-0 overflow-hidden rounded-lg">
                <CoverPlaceholder />
                <Image
                    src={!image || failed ? FALLBACK_COVER : image}
                    alt={title}
                    fill
                    sizes="(min-width: 640px) 128px, 90vw"
                    onError={() => setFailed(true)}
                    className="object-cover"
                />
            </div>

            {/* Content */}
            <div className="flex flex-col justify-center min-w-0 flex-1">
                <h3 className="line-clamp-2 font-bold text-black dark:text-white text-2xl">
                    {title}
                </h3>

                <div className="flex flex-wrap gap-2 text-xs mt-1 text-gray-500 dark:text-neutral-400">
                    <p className={completed ? "text-green-500" : "text-red-500"}>{completed ? "Completed" : "Ongoing"}</p>
                    <span>· {chapter} {chapter === 1 ? "Chapter" : "Chapters"}</span>
                    <span>· {author}</span>
                    {views && <span>· {views} views</span>}
                </div>

                <p className="text-gray-700 dark:text-neutral-300 text-sm mt-2 line-clamp-3">
                    {summary}
                </p>

                {/* Genres */}
                {tagList.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                        {tagList.map((g, index) => (
                            <span
                                key={index}
                                className={`text-[10px] px-2 py-0.5 rounded font-semibold ${TAG_COLORS[index] ?? "bg-gray-100 text-gray-700 dark:bg-dark-raised dark:text-neutral-300"}`}>
                                {g}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </Link>
    );
};