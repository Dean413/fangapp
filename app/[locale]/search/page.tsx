"use client";

// Search results: every book matching the words (title, author or tag), in the language picked on the site
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import Footer from "@/components/footer";
import { Bone } from "@/components/skeleton";
import { GenreCard } from "@/components/cards/two-column-cards/genre-card";
import { languageForLocale } from "@/lib/language";
import type { StoryCard } from "@/lib/stories";

function CardSkeleton() {
    return (
        <div className="flex flex-row gap-3 sm:gap-5 p-3 sm:p-4 rounded-2xl border border-gray-100 dark:border-dark-border">
            <Bone className="w-24 sm:w-32 md:w-44 aspect-3/4 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2.5 pt-1">
                <Bone className="h-5 w-3/4" />
                <Bone className="h-3 w-1/2" />
                <Bone className="h-3 w-full" />
                <Bone className="h-3 w-2/3" />
            </div>
        </div>
    );
}

function SearchResults() {
    const q = (useSearchParams().get("q") ?? "").trim();
    const language = languageForLocale(useLocale());
    const t = useTranslations("Search");
    const [books, setBooks] = useState<StoryCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const latest = useRef("");

    useEffect(() => {
        const key = `${language}|${q}`;
        latest.current = key;
        if (q.length < 2) {
            setBooks([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        setFailed(false);
        const params = new URLSearchParams({ q, language, limit: "60" });
        fetch(`/api/search?${params}`, { cache: "no-store" })
            .then(async (res) => {
                const data = await res.json().catch(() => ({}));
                if (latest.current !== key) return;
                if (!res.ok) throw new Error();
                setBooks(Array.isArray(data.books) ? data.books : []);
            })
            .catch(() => { if (latest.current === key) setFailed(true); })
            .finally(() => { if (latest.current === key) setLoading(false); });
    }, [q, language]);

    return (
        <div className="bg-gray-50 dark:bg-dark min-h-screen">
            <div className="w-[90%] mx-auto pt-8 pb-12">
                <h1 className="text-2xl md:text-3xl font-bold text-black dark:text-white">
                    {q ? t("resultsFor", { q }) : t("dialog")}
                </h1>

                <div className="mt-6">
                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            {Array.from({ length: 4 }, (_, i) => <CardSkeleton key={i} />)}
                        </div>
                    ) : failed ? (
                        <p className="py-16 text-center text-sm text-gray-500 dark:text-neutral-400">{t("failed")}</p>
                    ) : q.length < 2 ? (
                        <p className="py-16 text-center text-sm text-gray-500 dark:text-neutral-400">{t("tooShort")}</p>
                    ) : books.length === 0 ? (
                        <p className="py-16 text-center text-sm text-gray-500 dark:text-neutral-400">{t("noBooks")}</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            {books.map((b) => <GenreCard key={b.id} {...b} highlight={q} />)}
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
}

// useSearchParams needs a Suspense boundary in Next 16
export default function SearchPage() {
    return (
        <Suspense fallback={<div className="bg-gray-50 dark:bg-dark min-h-screen" />}>
            <SearchResults />
        </Suspense>
    );
}