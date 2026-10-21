"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { CoverPlaceholder } from "@/components/skeleton";
import { useTranslations } from "next-intl";

const FALLBACK_COVER = "/fang_pictures/bookFace.png";
const MAX_TAGS = 3;

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

export const GenreCard = (genreCard: cardDataProps) => {
    const { image, title, slug, genreSlug, author, genre, tags, chapter, summary, status, views } = genreCard;
    const [failed, setFailed] = useState(false);
    const t = useTranslations("Books");
    useEffect(() => setFailed(false), [image]);

    const completed = String(status).toUpperCase() === "COMPLETED";
    // The genre in red, then at most 3 tags (no repeat of the genre)
    const tagList = (Array.isArray(tags) ? tags : [tags])
        .filter((t) => t && t.toLowerCase() !== (genre ?? "").toLowerCase())
        .slice(0, MAX_TAGS);

    return (
        <Link
            href={`/stories/${genreSlug || "all"}/${slug}`}
            className="flex flex-row items-center gap-3 sm:gap-5 p-3 sm:p-4 rounded-2xl bg-white border border-gray-100 dark:bg-dark-card dark:border-transparent transition hover:shadow-sm hover:border-gray-200 dark:hover:bg-dark-raised">
            {/* Image: as tall as the text next to it */}
            <div className="w-24 sm:w-32 md:w-44 aspect-3/4 relative shrink-0 overflow-hidden rounded-lg">
                <CoverPlaceholder />
                <Image
                    src={!image || failed ? FALLBACK_COVER : image}
                    alt={title}
                    fill
                    sizes="(min-width: 768px) 176px, (min-width: 640px) 128px, 96px"
                    onError={() => setFailed(true)}
                    className="object-cover"
                />
            </div>

            {/* Content */}
            <div className="flex flex-col justify-center min-w-0 flex-1">
                <h3 className="line-clamp-1 font-bold text-gray-900 dark:text-white text-base sm:text-lg leading-snug">
                    {title}
                </h3>

                {/* Ongoing • Chapter 412 • Author */}
                <div className="mt-1 flex items-center gap-x-1.5 sm:gap-x-2 text-[11px] sm:text-sm text-gray-500 dark:text-neutral-400 min-w-0">
                    <span className={`shrink-0 font-semibold ${completed ? "text-green-600 dark:text-green-400" : "text-gray-800 dark:text-neutral-200"}`}>
                        {completed ? t("completed") : t("ongoing")}
                    </span>
                    <span aria-hidden="true">•</span>
                    <span className="shrink-0">{t("chapterN", { chapter })}</span>
                    <span aria-hidden="true">•</span>
                    <span className="truncate">{author}</span>
                </div>

                {summary && (
                    <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm leading-relaxed text-gray-700 dark:text-neutral-300 line-clamp-2 sm:line-clamp-3 md:line-clamp-5">
                        {summary}
                    </p>
                )}

                {/* Genre, tags, views */}
                <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-1.5">
                    {genre && (
                        <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[10px] sm:text-xs font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300">
                            {genre}
                        </span>
                    )}
                    {tagList.map((t) => (
                        <span
                            key={t}
                            className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] sm:text-xs text-gray-800 dark:bg-neutral-200 dark:text-neutral-900">
                            {t}
                        </span>
                    ))}
                    {views && (
                        <span className="ml-1 inline-flex items-center gap-1 text-[10px] sm:text-xs text-gray-500 dark:text-neutral-400">
                            <Eye size={13} /> {views}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
};