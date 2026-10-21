"use client";

import { useEffect, useState } from "react";
import BioField from "./text-area";
import { useTranslations } from "next-intl";

type Genre = { id: string; name: string };

type GenrePickerProps = {
    selected: string[];                     // genre IDs
    onChange: (ids: string[]) => void;
    bio: string;
    setBio: (value: string) => void;
};

// Readers can pick up to this many favourite genres
const MAX_GENRES = 10;

// The genre list comes from the admin's Primary Genre list (/api/genres), so it's always the same as the books' genres
export default function GenrePicker({ selected, onChange, bio, setBio }: GenrePickerProps) {
    const [genres, setGenres] = useState<Genre[] | null>(null);
    const t = useTranslations("Auth");

    useEffect(() => {
        let cancelled = false;
        fetch("/api/genres")
            .then((res) => res.json())
            .then((data) => { if (!cancelled) setGenres(Array.isArray(data.genres) ? data.genres : []); })
            .catch(() => { if (!cancelled) setGenres([]); });
        return () => { cancelled = true; };
    }, []);

    const toggleGenre = (id: string) => {
        if (selected.includes(id)) {
            onChange(selected.filter((g) => g !== id));
        } else if (selected.length < MAX_GENRES) {
            onChange([...selected, id]);
        }
    };

    return (
        <div className="flex flex-wrap gap-3">
            {genres === null
                ? Array.from({ length: 8 }).map((_, i) => (
                    <span key={i} className="h-9 w-24 rounded-full bg-gray-200 dark:bg-dark-raised animate-pulse" />
                ))
                : genres.map((genre) => {
                    const active = selected.includes(genre.id);
                    return (
                        <button
                            type="button"
                            key={genre.id}
                            onClick={() => toggleGenre(genre.id)}
                            className={`px-4 py-1 rounded-full border transition-all duration-200 ${active
                                ? "bg-red-100 dark:bg-red-500/15 text-red-900 dark:text-red-300 border-2 border-red-900 dark:border-red-500 font-semibold"
                                : "bg-gray-200 dark:bg-neutral-800 text-black dark:text-white border-gray-100 dark:border-dark-border hover:bg-gray-200 dark:hover:bg-neutral-700"
                                }`}
                        >
                            {genre.name}
                        </button>
                    );
                })}

            <BioField label={t("aboutYou")} value={bio} onChange={setBio} />
        </div>
    );
}