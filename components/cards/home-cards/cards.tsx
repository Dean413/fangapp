"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { CoverPlaceholder } from "@/components/skeleton";
import Imprint from "@/components/imprint";
import { useTranslations } from "next-intl";
import { useOptionNames } from "@/hooks/useOptionName";

const FALLBACK_COVER = "/fang_pictures/bookFace.png";

interface cardProps {
    title: string;
    rank?: string;
    status?: string;
    author: string;
    views?: string;
    genre?: string;
    image: string;
    tags?: string[];
    label?: string;
    summary?: string;
    style?: string;
}

// Cover image that falls back to the default cover if it's missing or fails to load
function CoverImage({ src, alt, sizes }: { src?: string; alt: string; sizes: string }) {
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [src]);
    return (
        <Image
            src={!src || failed ? FALLBACK_COVER : src}
            alt={alt}
            fill
            sizes={sizes}
            onError={() => setFailed(true)}
            className="object-cover"
        />
    );
}

export const BookCard = (props: cardProps) => {
    const { title, author, views, image, tags, genre } = props;
    const tag = tags?.find((t) => t && t.toLowerCase() !== genre?.toLowerCase());
    const tr = useOptionNames();
    const b = useTranslations("Books");

    return (
        <div className="rounded-xl overflow-hidden">
            <div className="w-full aspect-3/4 relative overflow-hidden rounded-xl">
                <CoverPlaceholder />
                <CoverImage src={image} alt={title} sizes="(min-width: 1024px) 14vw, (min-width: 768px) 20vw, 33vw" />
                <Imprint />
            </div>
            {/* CONTENT */}
            <div className="pt-2 sm:p-3 space-y-1">
                <h3 className="text-xs sm:text-sm font-semibold line-clamp-1 leading-tight text-gray-900 dark:text-white">
                    {title}
                </h3>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-neutral-400 truncate">{author}</p>

                {(genre || tag) && (
                    <div className="flex min-w-0 flex-wrap gap-1">
                        {genre && (
                            <span className="text-[9px] sm:text-[10px] font-medium bg-pink-50 dark:bg-pink-500/15 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-500/30 max-w-full truncate px-1.5 py-0.5 rounded">
                                {tr(genre)}
                            </span>
                        )}
                        {tag && (
                            <span className="text-[9px] sm:text-[10px] bg-gray-100 dark:bg-transparent dark:border dark:border-neutral-600 text-gray-600 dark:text-neutral-200 max-w-full truncate px-1.5 py-0.5 rounded">
                                {tr(tag)}
                            </span>
                        )}
                    </div>
                )}

                {views && (
                    <p className="text-[10px] sm:text-xs text-gray-400 dark:text-neutral-500">{b("viewsCount", { views })}</p>
                )}
            </div>
        </div>
    );
};

export const Trending = (trending: cardProps) => {
    const { image, title, tags, author, rank, views, summary } = trending;
    const t = useTranslations("Books");
    const tr = useOptionNames();
    return (
        <div className="flex items-center gap-3 sm:gap-4 rounded-2xl bg-white dark:bg-dark-card p-3 sm:p-4 shadow-md">
            <h1 className={`w-8 sm:w-10 shrink-0 text-center text-2xl sm:text-3xl font-bold ${rank === "02" ? "text-red-500" : "text-gray-400 dark:text-neutral-500"}`}>
                {rank}
            </h1>
            <div className="w-14 sm:w-24 aspect-3/4 relative shrink-0 overflow-hidden rounded-lg">
                <CoverPlaceholder />
                <CoverImage src={image} alt={title} sizes="96px" />
            </div>
            <div className="min-w-0 flex-1">
                <h3 className="line-clamp-1 text-xs sm:text-base font-bold text-gray-900 dark:text-white">{title}</h3>
                <p className="mt-0.5 line-clamp-1 text-[10px] sm:text-sm text-gray-500 dark:text-neutral-400">{t("byAuthor", { author })}</p>
                {summary && (
                    <p className="mt-1 line-clamp-2 text-[10px] sm:text-sm text-gray-400 dark:text-neutral-500">{summary}</p>
                )}
                <div className="mt-1.5 flex min-w-0 gap-1.5 overflow-hidden">
                    {tags?.slice(0, 3).map((g, index) => (
                        <span key={index} className={`min-w-0 truncate text-[9px] sm:text-[10px] ${index === 0 ? "bg-red-100 dark:bg-red-500/15 text-red-500 dark:text-red-400 font-semibold" : "bg-gray-100 dark:bg-transparent dark:border dark:border-neutral-600 text-gray-800 dark:text-neutral-200"} px-1.5 py-0.5 rounded`}>
                            {tr(g)}
                        </span>
                    ))}
                </div>
            </div>
            <div className="shrink-0 text-right">
                <p className="text-sm sm:text-lg font-bold text-black dark:text-white">{views}</p>
                <p className="text-[8px] sm:text-xs uppercase tracking-wide text-gray-300 dark:text-neutral-500">{t("reads")}</p>
            </div>
        </div>
    );
};

export const Explore = (explore: cardProps) => {
    const { image, title, tags, author } = explore;
    const tr = useOptionNames();
    return (
        <div className="md:flex gap-8 sm:gap-4 p-3 sm:p-4 rounded-2xl">
            <div className="w-28 aspect-3/4 relative shrink-0 overflow-hidden rounded-lg">
                <CoverPlaceholder />
                <CoverImage src={image} alt={title} sizes="112px" />
            </div>
            <div className="flex flex-col justify-center min-w-0">
                <h3 className="font-bold text-sm sm:text-base line-clamp-2 text-gray-900 dark:text-white">
                    {title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">{author}</p>
                <div className="md:flex min-w-0 flex-wrap gap-1 mt-2">
                    {tags?.slice(0, 1).map((g, index) => (
                        <span key={index} className={`text-[9px] sm:text-[10px] ${index === 0 ? "bg-red-100 dark:bg-red-500/15 text-red-500 dark:text-red-400 font-semibold" : "bg-gray-100 dark:bg-transparent dark:border dark:border-neutral-600 text-gray-800 dark:text-neutral-200"} max-w-full truncate px-1.5 py-0.5 rounded`}>
                            {tr(g)}
                        </span>
                    ))}
                </div>
                {tags && (
                    <div className="flex min-w-0 flex-wrap gap-1 mt-2">
                        {tags.map((t, index) => (
                            <span key={index} className="text-[9px] sm:text-[10px] bg-gray-100 dark:bg-transparent dark:border dark:border-neutral-600 text-gray-600 dark:text-neutral-200 max-w-full truncate px-1.5 py-0.5 rounded">
                                {tr(t)}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};