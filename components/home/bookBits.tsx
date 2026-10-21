// app/components/home/bookBits.tsx
// Small pieces shared by the Home rows: section header, genre/tag pills, corner ribbons, counts, book links.
import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import Imprint from "@/components/imprint";
import type { HomeBook } from "@/lib/home";
import { useTranslations } from "next-intl";

// 24900 -> "24.9K", 1200000 -> "1.2M"
export function formatCount(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
    return String(n);
}

// "Werewolf" -> "werewolf", "Billionaire Romance" -> "billionaire-romance" (same rules as the database's fang_slugify)
export function slugify(text: string | null | undefined) {
    return (text ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ß/g, "ss")
        .replace(/[Łł]/g, "l")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

// /stories/werewolf/plus-size-mate-for-my-brother-s-three-best-friends-by-faithuba (comics: /comics/...)
export const bookHref = (book: Pick<HomeBook, "kind" | "genre" | "slug">) =>
    `/${book.kind === "comic" ? "comics" : "stories"}/${slugify(book.genre) || "all"}/${book.slug}`;

export function SectionHeader({ title, href }: { title: string; href?: string }) {
    const t = useTranslations("Books");
    return (
        <div className="mb-5 flex items-start justify-between">
            <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
                <span className="mt-1 block h-0.5 w-8 rounded bg-red-600 dark:bg-red-500" />
            </div>
            {href && (
                <Link href={href} className="flex items-center gap-0.5 text-xs font-medium text-red-600 hover:underline dark:text-red-400">
                    {t("viewAll")} <ChevronRight size={14} />
                </Link>
            )}
        </div>
    );
}

// Primary genre in red, then the book's first tags in grey
export function BookPills({ book, max = 2 }: { book: HomeBook; max?: number }) {
    const tags = book.tags.slice(0, book.genre ? max - 1 : max);
    return (
        <div className="flex flex-wrap gap-1.5">
            {book.genre && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-500/15 dark:text-red-400">
                    {book.genre}
                </span>
            )}
            {tags.map((t) => (
                <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700 dark:bg-transparent dark:border dark:border-neutral-600 dark:text-neutral-200">
                    {t}
                </span>
            ))}
        </div>
    );
}

// Diagonal ribbons in the cover's top-left corner: red "Exclusive", green "Completed" (sit on the cover image, so same in both themes)
export function CoverRibbons({ book }: { book: HomeBook }) {
    const t = useTranslations("Books");
    const ribbons = [
        book.exclusive && { label: t("exclusive"), color: "bg-red-600" },
        book.completed ? { label: t("completed"), color: "bg-green-600" } : { label: t("ongoing"), color: "bg-purple-600" },
    ].filter(Boolean) as { label: string; color: string }[];
    return ribbons.map((r, i) => (
        <span
            key={r.label}
            className={`absolute -left-8 w-28 -rotate-45 py-0.5 text-center text-[7px] font-bold uppercase tracking-wide text-white shadow ${r.color}`}
            style={{ top: 10 + i * 19 }}>
            {r.label}
        </span>
    ));
}

// Average review rating, e.g. "★ 4.5" (nothing when the book has no reviews yet)
export function Rating({ book, className = "" }: { book: HomeBook; className?: string }) {
    if (book.rating == null) return null;
    return (
        <span className={`inline-flex items-center gap-0.5 ${className}`}>
            <Star size={11} className="fill-current" /> {book.rating.toFixed(1)}
        </span>
    );
}

// The cover with its ribbons (top left) and the imprint logo (top right)
export function Cover({ book, className, imprint = "md" }: { book: HomeBook; className: string; imprint?: "sm" | "md" | "lg" }) {
    return (
        <div className={`relative overflow-hidden rounded-md bg-gray-200 shadow-sm dark:bg-dark-raised dark:shadow-none ${className}`}>
            {book.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={book.image} alt={book.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
            )}
            <CoverRibbons book={book} />
            <Imprint size={imprint} />
        </div>
    );
}