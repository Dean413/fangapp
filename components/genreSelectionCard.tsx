"use client";

import { useEffect, useState } from "react";
import { Plus, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOptionNames } from "@/hooks/useOptionName";

type Genre = { id: string; name: string };

type GenrePickerProps = {
    selected: string[];                     // genre IDs
    onChange: (ids: string[]) => void;
};

// Readers can pick up to this many favourite genres
const MAX_GENRES = 10;

// Only these genres are offered, in this order (matched to the admin's Primary Genre list by name)
const OFFERED = [
    "Vampire", "Mafia", "Urban", "Dark Romance", "Erotic",
    "Werewolf", "Romance", "Fantasy", "Billionaire", "LGBTQ+",
    "Romantic Suspense", "Contemporary Romance", "Reverse Harem",
    "Dark Academia", "Omegaverse", "Paranormal",
];

// The genre list comes from the admin's Primary Genre list (/api/genres); only the OFFERED ones are shown
export default function GenrePicker({ selected, onChange }: GenrePickerProps) {
    const [genres, setGenres] = useState<Genre[] | null>(null);
    const t = useTranslations("Auth");
    const tr = useOptionNames();

    useEffect(() => {
        let cancelled = false;
        fetch("/api/genres")
            .then((res) => res.json())
            .then((data) => {
                if (cancelled) return;
                const all: Genre[] = Array.isArray(data.genres) ? data.genres : [];
                const byName = new Map(all.map((g) => [g.name.trim().toLowerCase(), g]));
                setGenres(OFFERED.map((n) => byName.get(n.toLowerCase())).filter((g): g is Genre => Boolean(g)));
            })
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
                    <span key={i} className="h-10 w-28 rounded-lg bg-gray-200 dark:bg-dark-raised animate-pulse" />
                ))
                : genres.map((genre) => {
                    const active = selected.includes(genre.id);
                    return (
                        <button
                            type="button"
                            key={genre.id}
                            onClick={() => toggleGenre(genre.id)}
                            aria-pressed={active}
                            className={`inline-flex max-w-full items-center gap-2 px-4 py-2 rounded-lg border text-[15px] font-semibold transition-all duration-200 ${active
                                ? "bg-red-50 dark:bg-red-500/15 text-red-900 dark:text-red-300 border-red-900 dark:border-red-500"
                                : "bg-white dark:bg-transparent text-gray-500 dark:text-neutral-400 border-gray-400 dark:border-neutral-600 hover:bg-gray-50 dark:hover:bg-neutral-800"
                                }`}
                        >
                            <span className="truncate">{tr(genre.name)}</span>
                            {active ? <Check size={16} className="shrink-0" /> : <Plus size={16} className="shrink-0" />}
                        </button>
                    );
                })}
        </div>
    );
}