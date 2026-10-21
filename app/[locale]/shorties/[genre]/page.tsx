"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

export default function ShortiesGenresPage() {
    const { genre } = useParams();
    const t = useTranslations("Shorties");

    const formattedGenre = String(genre)
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

    return (
        <div className="p-6">
            <h1 className="text-sm text-gray-500 dark:text-neutral-400">
                {t("title")} / {formattedGenre}
            </h1>

            <p className="text-gray-500 dark:text-neutral-400 mt-2">
                {t("showingGenre")}
            </p>
        </div>
    );
}