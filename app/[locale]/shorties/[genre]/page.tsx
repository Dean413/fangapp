"use client";

import { useParams } from "next/navigation";

export default function ShortiesGenresPage() {
    const { genre } = useParams();

    const formattedGenre = String(genre)
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

    return (
        <div className="p-6">
            <h1 className="text-sm text-gray-500 dark:text-neutral-400">
                Shorties / {formattedGenre}
            </h1>

            <p className="text-gray-500 dark:text-neutral-400 mt-2">
                Showing all shorties in this genre
            </p>
        </div>
    );
}