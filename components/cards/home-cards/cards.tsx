"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { CoverPlaceholder } from "@/components/skeleton";
import { useTranslations } from "next-intl";

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

// Corner ribbons (label, then status) across the cover's top-left corner.
// Drawn as one SVG so each text sits exactly in the middle of its band.
// 1 unit = 0.1em, and the whole set scales with the text size per screen.
const RIBBON_OFFSETS = [29, 47]; // distance of each band's centre from the corner

function CornerRibbons({ label, status }: { label?: string; status?: string }) {
    const t = useTranslations("Books");
    const ribbons = [
        label ? { text: label, fill: "fill-red-700" } : null,
        String(status ?? "").toUpperCase() === "COMPLETED"
            ? { text: t("completed"), fill: "fill-green-800" }
            : { text: t("ongoing"), fill: "fill-red-600" },
    ].filter(Boolean) as { text: string; fill: string }[];

    if (ribbons.length === 0) return null;

    return (
        <svg
            viewBox="0 0 120 120"
            aria-hidden="true"
            className="absolute top-0 left-0 w-[12em] h-[12em] z-10 pointer-events-none text-[5px] md:text-[6.5px] drop-shadow-md">
            {ribbons.map((ribbon, i) => {
                const o = RIBBON_OFFSETS[i];
                return (
                    <g key={ribbon.text} transform={`rotate(-45 ${o} ${o})`}>
                        <rect x={o - 80} y={o - 9} width={160} height={18} className={ribbon.fill} />
                        <text
                            x={o + 0.4}
                            y={o}
                            dy="0.35em"
                            textAnchor="middle"
                            fill="white"
                            fontSize={10}
                            fontWeight={600}
                            letterSpacing={0.8}>
                            {ribbon.text.toLocaleUpperCase()}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

export const BookCard = (props: cardProps) => {
    const { title, status, author, views, image, label, tags, genre } = props;
    const tag = tags?.find((t) => t && t.toLowerCase() !== genre?.toLowerCase());

    return (
        <div className="rounded-xl overflow-hidden">
            <div className="w-full aspect-3/4 relative overflow-hidden rounded-xl">
                <CoverPlaceholder />

                {/* RIBBONS */}
                <CornerRibbons label={label} status={status} />

                <CoverImage src={image} alt={title} sizes="(min-width: 1024px) 14vw, (min-width: 768px) 20vw, 33vw" />
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
                                {genre}
                            </span>
                        )}
                        {tag && (
                            <span className="text-[9px] sm:text-[10px] bg-gray-100 dark:bg-transparent dark:border dark:border-neutral-600 text-gray-600 dark:text-neutral-200 max-w-full truncate px-1.5 py-0.5 rounded">
                                {tag}
                            </span>
                        )}
                    </div>
                )}

                {views && (
                    <p className="text-[10px] sm:text-xs text-gray-400 dark:text-neutral-500">{views} views</p>
                )}
            </div>
        </div>
    );
};

export const Trending = (trending: cardProps) => {
    const { image, title, tags, author, rank, views, summary } = trending;
    const t = useTranslations("Books");
    return (
        <div className="flex gap-3 justify-between sm:gap-4 bg-white dark:bg-dark-card p-3 sm:p-4 rounded-2xl shadow-md">
            <h1 className={`text-2xl sm:text-3xl ${rank === "02" ? "text-red-500" : "text-gray-400 dark:text-neutral-500"} font-bold flex items-center shrink-0`}>
                {rank}
            </h1>
            <div className="w-16 sm:w-24 aspect-3/4 relative shrink-0 overflow-hidden rounded-lg">
                <CoverPlaceholder />
                <CoverImage src={image} alt={title} sizes="96px" />
            </div>
            <div className="flex flex-col justify-center min-w-0">
                <h3 className="font-bold text-sm sm:text-base line-clamp-2 text-gray-900 dark:text-white">
                    {title}
                </h3>
                <p className="text-gray-400 dark:text-neutral-500 text-xs sm:text-sm min-[450px]:block hidden">{summary}</p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-neutral-400 mt-1">by {author}</p>
                <div className="flex min-w-0 gap-1.5 flex-wrap mt-2">
                    {tags?.map((g, index) => (
                        <span key={index} className={`text-[9px] sm:text-[10px] ${index === 0 ? "bg-red-100 dark:bg-red-500/15 text-red-500 dark:text-red-400 font-semibold" : "bg-gray-100 dark:bg-transparent dark:border dark:border-neutral-600 text-gray-800 dark:text-neutral-200"} max-w-full truncate px-1.5 py-0.5 rounded`}>
                            {g}
                        </span>
                    ))}
                </div>
            </div>
            <div className="flex items-center shrink-0">
                <div className="flex flex-col  justify-end">
                    <p className="text-black dark:text-white font-bold">{views}</p>
                    <p className="text-gray-300 dark:text-neutral-500 text-xs uppercase">{t("reads")}</p>
                </div>

            </div>
        </div>
    );
};

export const Explore = (explore: cardProps) => {
    const { image, title, tags, author } = explore;
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
                            {g}
                        </span>
                    ))}
                </div>
                {tags && (
                    <div className="flex min-w-0 flex-wrap gap-1 mt-2">
                        {tags.map((t, index) => (
                            <span key={index} className="text-[9px] sm:text-[10px] bg-gray-100 dark:bg-transparent dark:border dark:border-neutral-600 text-gray-600 dark:text-neutral-200 max-w-full truncate px-1.5 py-0.5 rounded">
                                {t}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};