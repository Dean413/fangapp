"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { useLibraryStore } from "@/lib/store/library-store";

// The bookmark on a book row: adds / removes the book from the reader's library
export default function BookmarkButton({ slug, storyId, title, image, label }: {
    slug: string; storyId: string; title: string; image: string | null; label: string;
}) {
    const toggleBook = useLibraryStore((s) => s.toggleBook);
    const saved = useLibraryStore((s) => s.saved.some((b) => b.id === slug || b.storyId === storyId));
    const [busy, setBusy] = useState(false);

    const onClick = async () => {
        if (busy) return;
        setBusy(true);
        try {
            await toggleBook({ id: slug, storyId, title, image: image ?? "" });
        } finally {
            setBusy(false);
        }
    };

    return (
        <button type="button" onClick={onClick} disabled={busy} aria-label={label} aria-pressed={saved}
            className="shrink-0 p-1 text-gray-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400 disabled:opacity-60 transition">
            <Bookmark size={18} className={saved ? "fill-current text-red-600 dark:text-red-400" : ""} />
        </button>
    );
}