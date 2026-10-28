"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bookmark, Eye, Star } from "lucide-react";
import { CoverPlaceholder } from "@/components/skeleton";
import { useTranslations } from "next-intl";
import { useLibraryStore } from "@/lib/store/library-store";
import { useOptionNames } from "@/hooks/useOptionName";
import Imprint from "@/components/imprint";

const FALLBACK_COVER = "/fang_pictures/bookFace.png";
const MAX_TAGS = 3;

interface cardDataProps {
    id?: string | number;
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
    rating?: number | null;
    highlight?: string; // the searched words, marked in the title, author and tags
}

// Wraps the searched words in a marker (not case sensitive)
function Highlight({ text, words }: { text: string; words?: string }) {
    const q = (words ?? "").trim();
    if (q.length < 2) return <>{text}</>;
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${safe})`, "gi"));
    return (
        <>
            {parts.map((part, i) =>
                i % 2 === 1 ? (
                    <mark key={i} className="rounded-sm bg-red-700 px-0.5 text-white">
                        {part}
                    </mark>
                ) : (
                    part
                )
            )}
        </>
    );
}

export const GenreCard = (genreCard: cardDataProps) => {
    const { id, image, title, slug, genreSlug, author, genre, tags, chapter, summary, views, rating, highlight } = genreCard;
    const [failed, setFailed] = useState(false);
    const [saving, setSaving] = useState(false);
    const t = useTranslations("Books");
    const bk = useTranslations("Book");
    // Genre and tag names in the site's language
    const tr = useOptionNames();
    useEffect(() => setFailed(false), [image]);

    // Library: saved or not, and the toggle
    const toggleBook = useLibraryStore((s) => s.toggleBook);
    const saved = useLibraryStore((s) => s.saved.some((b) => b.id === slug || b.storyId === String(id ?? "")));

    const handleSave = async (e: React.MouseEvent) => {
        // The card is a link: the bookmark must not open the book
        e.preventDefault();
        e.stopPropagation();
        if (saving) return;
        setSaving(true);
        try {
            await toggleBook({ id: slug, title, image: image || FALLBACK_COVER });
        } finally {
            setSaving(false);
        }
    };

    // The genre in red, then at most 3 tags (no repeat of the genre)
    const tagList = (Array.isArray(tags) ? tags : [tags])
        .filter((x) => x && x.toLowerCase() !== (genre ?? "").toLowerCase())
        .slice(0, MAX_TAGS);
    // "by {author}" in the site's language, with the author name marked when searched
    const [beforeAuthor, afterAuthor = ""] = t("byAuthor", { author: "\u0001" }).split("\u0001");
    return (
        <Link
            href={`/stories/${genreSlug || "all"}/${slug}`}
            className="flex flex-row items-start gap-3 sm:gap-5 p-3 sm:p-4 rounded-2xl bg-white border border-gray-100 dark:bg-dark-card dark:border-transparent transition hover:shadow-sm hover:border-gray-200 dark:hover:bg-dark-raised">
            {/* Cover */}
            <div className="w-28 sm:w-32 md:w-44 aspect-3/4 relative shrink-0 overflow-hidden rounded-lg">
                <CoverPlaceholder />
                <Image
                    src={!image || failed ? FALLBACK_COVER : image}
                    alt={title}
                    fill
                    sizes="(min-width: 768px) 176px, (min-width: 640px) 128px, 112px"
                    onError={() => setFailed(true)}
                    className="object-cover"
                />
                <Imprint />
            </div>

            {/* Content */}
            <div className="relative flex min-w-0 flex-1 flex-col">
                {/* Bookmark, top right */}
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    aria-label={saved ? bk("inLibrary") : bk("addToLibrary")}
                    className="absolute right-0 top-0 text-gray-500 hover:text-red-600 disabled:opacity-60 dark:text-neutral-400">
                    <Bookmark size={24} className={saved ? "fill-red-600 text-red-600" : ""} />
                </button>

                {/* Genre and tags: one line, cut with "…" */}
                <div className="flex flex-nowrap items-center gap-2 overflow-hidden pr-9">
                    {genre && (
                        <span className="min-w-0 shrink truncate rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold text-red-600 dark:bg-red-500/15 dark:text-red-300">
                            {tr(genre)}
                        </span>
                    )}
                    {tagList.map((x, i) => (
                        <span
                            key={x}
                            className={`min-w-0 shrink truncate rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] sm:text-xs font-medium text-gray-600 dark:bg-neutral-200 dark:text-neutral-900 ${i >= 1 ? "max-sm:hidden" : ""}`}>
                            <Highlight text={tr(x)} words={highlight} />
                        </span>
                    ))}
                </div>

                <h3 className="mt-2 line-clamp-1 text-lg sm:text-xl leading-snug text-gray-900 dark:text-white">
                    <Highlight text={title} words={highlight} />
                </h3>

                {/* by Author · 198 chapters */}
                <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-neutral-400">
                    {beforeAuthor}<Highlight text={author} words={highlight} />{afterAuthor} · {bk("chapters", { count: chapter })}
                </p>

                {/* Views and rating */}
                <div className="mt-1.5 flex items-center gap-4 text-sm text-gray-500 dark:text-neutral-400">
                    {views && (
                        <span className="inline-flex items-center gap-1.5">
                            <Eye size={16} /> {views}
                        </span>
                    )}
                    {rating != null && (
                        <span className="inline-flex items-center gap-1.5">
                            <Star size={14} className="fill-amber-400 text-amber-400" /> {rating.toFixed(1)}
                        </span>
                    )}
                </div>

                {summary && (
                    <p className="mt-2 line-clamp-2 sm:line-clamp-3 md:line-clamp-5 text-sm leading-relaxed text-gray-700 dark:text-neutral-300">
                        {summary}
                    </p>
                )}
            </div>
        </Link>
    );
};