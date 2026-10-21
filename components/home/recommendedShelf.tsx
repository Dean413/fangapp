"use client";

// app/components/home/recommendedShelf.tsx
// Recommended: books from the signed-in reader's favorite genres, in the selected language (a cover row like the others).
// Shows nothing when signed out, when no favorite genres are picked, or when there's nothing new to suggest.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import type { HomeBook } from "@/lib/home";
import { useAuthStore } from "@/lib/store/authStore";
import { BookPills, Cover, Rating, SectionHeader, bookHref, formatCount } from "./bookBits";
import { useTranslations } from "next-intl";

const CARD = "block w-36 shrink-0 snap-start sm:w-40 lg:w-[calc((100%-5rem)/6)]";

export default function RecommendedShelf({ tenant, language }: { tenant: string; language?: string }) {
    const userId = useAuthStore((s) => s.user?.id ?? null);
    const t = useTranslations("Books");
    const [books, setBooks] = useState<HomeBook[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setBooks([]);
        if (!userId) return;
        let cancelled = false;
        setLoading(true);
        const params = new URLSearchParams({ tenant, language: language || "English" });
        fetch(`/api/recommended?${params}`, { credentials: "include", cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => { if (!cancelled) setBooks(Array.isArray(data?.books) ? data.books : []); })
            .catch(() => { })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [userId, tenant, language]);

    if (!userId || (!loading && books.length === 0)) return null;

    return (
        <section>
            <SectionHeader title={t("recommended")} />
            <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-2 scrollbar-width:none [&::-webkit-scrollbar]:hidden">
                {loading
                    ? Array.from({ length: 6 }, (_, i) => (
                        <div key={i} className={`${CARD} animate-pulse`}>
                            <div className="aspect-3/4 w-full rounded-md bg-gray-200 dark:bg-dark-raised" />
                            <div className="mt-2 h-4 w-3/4 rounded bg-gray-200 dark:bg-dark-raised" />
                            <div className="mt-1.5 h-3 w-1/2 rounded bg-gray-200 dark:bg-dark-raised" />
                        </div>
                    ))
                    : books.map((book) => (
                        <Link key={book.id} href={bookHref(book)} className={`group ${CARD}`}>
                            <Cover book={book} className="aspect-3/4 w-full" />
                            <h3 className="mt-2 line-clamp-1 text-sm font-semibold text-gray-900 dark:text-white">{book.title}</h3>
                            <p className="mt-0.5 line-clamp-1 text-xs text-gray-500 dark:text-neutral-400">{book.author}</p>
                            <div className="mt-1.5">
                                <BookPills book={book} />
                            </div>
                            <p className="mt-1.5 flex items-center gap-3 text-[11px] text-gray-500 dark:text-neutral-400">
                                <span className="inline-flex items-center gap-1"><Eye size={12} /> {formatCount(book.views)} views</span>
                                <Rating book={book} />
                            </p>
                        </Link>
                    ))}
            </div>
        </section>
    );
}