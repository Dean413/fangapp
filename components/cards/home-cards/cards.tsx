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
    author: string;
    views?: string;
    genre?: string;
    image: string;
    tags?: string[];
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

