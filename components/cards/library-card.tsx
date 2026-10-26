"use client"

import Image from "next/image";
import Link from "next/link";
import { useLibraryStore } from "@/lib/store/library-store";
import { useTranslations } from "next-intl";
import Imprint from "@/components/imprint";


type Props = {
    id: string;
    title: string;
    image: string;
    href?: string;                // the last chapter read (or chapter 1)
    lastChapter?: number | null;
    chapterCount?: number;
}

export default function LibraryCard({
    id,
    title,
    image,
    href,
    lastChapter,
    chapterCount,
}: Props) {

    const isEditMode = useLibraryStore((state) => state.isEditMode);
    const selected = useLibraryStore((state) => state.selected);
    const toggleSelect = useLibraryStore((state) => state.toggleSelect);
    const t = useTranslations("Books");

    const checked = selected.includes(id);

    // Every cover the same 3:4 frame, the image cropped to fill it
    const cover = (
        <div className="relative w-full aspect-3/4 overflow-hidden rounded-lg bg-gray-200 dark:bg-dark-raised">
            <Image
                src={image}
                alt={title}
                fill
                unoptimized
                sizes="(max-width: 768px) 50vw, 200px"
                className="object-cover"
            />
            <Imprint />
        </div>
    );

    // Progress: bar + "Ch. 61 / 100 · 61%" (a saved book not opened yet: empty bar + "Not started · Saved")
    const total = lastChapter != null ? Math.max(chapterCount ?? 0, lastChapter, 1) : 0;
    const percent = lastChapter != null ? Math.min(100, Math.round((lastChapter / total) * 100)) : 0;

    return (
        <div className="relative">
            <div className="relative">
                {/* Tap to continue reading; in edit mode, tap to select */}
                {isEditMode ? (
                    <button type="button" onClick={() => toggleSelect(id)} className="block w-full cursor-pointer">
                        {cover}
                    </button>
                ) : href ? (
                    <Link href={href} className="block">{cover}</Link>
                ) : (
                    cover
                )}

                {isEditMode && (
                    <button
                        type="button"
                        onClick={() => toggleSelect(id)}
                        className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer ${checked
                            ? "bg-red-600 border-red-600"
                            : "bg-white dark:bg-dark-card border-gray-400 dark:border-neutral-600"
                            }`}
                    >
                        {checked && <span className="text-white text-sm">✓</span>}
                    </button>
                )}
            </div>

            <h3 className="mt-2 font-semibold truncate">{title}</h3>

            <div className="mt-1.5">
                <div className={`h-0.5 ${lastChapter != null ? "w-[85%]" : "w-full"} rounded-full bg-gray-300 dark:bg-neutral-600 overflow-hidden`}>
                    <div className="h-full rounded-full bg-red-600" style={{ width: `${percent}%` }} />
                </div>
                <p className="mt-1.5 text-[11px] text-gray-500 dark:text-neutral-400">
                    {lastChapter != null ? t("progress", { chapter: lastChapter, total, percent }) : t("notStartedSaved")}
                </p>
            </div>
        </div>
    )
}