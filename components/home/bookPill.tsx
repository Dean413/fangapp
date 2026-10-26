"use client";

import type { HomeBook } from "@/lib/home";
import { useOptionNames } from "@/hooks/useOptionName";

// Primary genre in red, then the book's first tags in grey. Long names are cut with "…".
export function BookPills({ book, max = 2 }: { book: HomeBook; max?: number }) {
    const tr = useOptionNames();
    const tags = book.tags.slice(0, book.genre ? max - 1 : max);
    return (
        <div className="flex min-w-0 flex-nowrap gap-1.5 overflow-hidden">
            {book.genre && (
                <span className="max-w-[60%] shrink-0 truncate rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-500/15 dark:text-red-400">
                    {tr(book.genre)}
                </span>
            )}
            {tags.map((t) => (
                <span key={t} className="min-w-0 shrink truncate rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700 dark:bg-transparent dark:border dark:border-neutral-600 dark:text-neutral-200">
                    {tr(t)}
                </span>
            ))}
        </div>
    );
}

// One genre or tag name in the site's language (for places that print a single name, including server components)
export function OptionName({ name }: { name: string | null | undefined }) {
    const tr = useOptionNames();
    return <>{tr(name)}</>;
}