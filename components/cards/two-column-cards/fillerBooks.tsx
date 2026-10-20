"use client";

// ⚠️ TEMPORARY: while there aren't many books yet.
// After the real books, keeps adding the same books in a random order as the reader scrolls, so the
// genre page never seems to end. To remove it: delete this file and the two lines marked "TEMPORARY"
// in the genres page (the import and <FillerBooks ... />).
import { useEffect, useRef, useState } from "react";
import type { StoryCard } from "@/lib/stories";
import { GenreCard } from "./genre-card";

const BATCH = 20;       // books added each time the reader reaches the bottom (never the same book twice in one)
const MAX_BATCHES = 25; // stop after this many, so the page can't grow forever

// A random order of the books, not starting with `avoidFirst` (the last book of the previous batch)
function shuffled(books: StoryCard[], avoidFirst?: string | number) {
    const list = [...books];
    for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
    }
    if (list.length > 1 && list[0].id === avoidFirst) [list[0], list[1]] = [list[1], list[0]];
    return list;
}

export default function FillerBooks({ books }: { books: StoryCard[] }) {
    const [batches, setBatches] = useState<StoryCard[][]>([]);
    const bottom = useRef<HTMLDivElement>(null);

    // A new genre or language: start again
    useEffect(() => { setBatches([]); }, [books]);

    useEffect(() => {
        const el = bottom.current;
        if (!el || books.length === 0) return;
        const observer = new IntersectionObserver((entries) => {
            if (!entries[0]?.isIntersecting) return;
            setBatches((prev) => {
                if (prev.length >= MAX_BATCHES) return prev;
                const last = prev[prev.length - 1]?.at(-1)?.id;
                return [...prev, shuffled(books, last).slice(0, BATCH)];
            });
        }, { rootMargin: "600px 0px" });
        observer.observe(el);
        return () => observer.disconnect();
        // Watching again after each batch: if the bottom is still in view (few books), the next batch comes too
    }, [books, batches.length]);

    if (books.length === 0) return null;

    return (
        <>
            {batches.length > 0 && (
                <div className="mt-3 sm:mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {batches.map((batch, b) =>
                        batch.map((item) => <GenreCard key={`filler-${b}-${item.id}`} {...item} />)
                    )}
                </div>
            )}
            {batches.length < MAX_BATCHES && <div ref={bottom} aria-hidden="true" className="h-px" />}
        </>
    );
}