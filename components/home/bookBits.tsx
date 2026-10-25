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

// Genre / tag pills: a client component (it shows the names in the site language), so it lives in its own file
export { BookPills, OptionName } from "./bookPill";

// Diagonal ribbons in the cover's top-left corner: red "Exclusive", green "Completed" (sit on the cover image, so same in both themes)
// Corner ribbons across the cover's top-left corner, drawn as one SVG so each text
// sits exactly in the middle of its band (1 unit = 1px).
const RIBBON_OFFSETS = [22, 31.5]; // distance of each band's centre from the corner

export function CoverRibbons({ book }: { book: HomeBook }) {
    const t = useTranslations("Books");
    const ribbons = [
        book.exclusive && { label: t("exclusive"), fill: "fill-red-600" },
        book.completed ? { label: t("completed"), fill: "fill-green-600" } : { label: t("ongoing"), fill: "fill-red-600" },
    ].filter(Boolean) as { label: string; fill: string }[];

    return (
        <svg
            viewBox="0 0 80 80"
            aria-hidden="true"
            className="absolute top-0 left-0 z-10 aspect-square w-[62%] h-auto pointer-events-none drop-shadow-sm sm:w-20">
            {ribbons.map((r, i) => {
                const o = RIBBON_OFFSETS[i];
                return (
                    <g key={r.label} transform={`rotate(-45 ${o} ${o})`}>
                        <rect x={o - 56} y={o - 6.75} width={112} height={13.5} className={r.fill} />
                        <text
                            x={o + 0.1}
                            y={o}
                            dy="0.35em"
                            textAnchor="middle"
                            fill="white"
                            fontSize={7}
                            fontWeight={700}
                            letterSpacing={0.2}>
                            {r.label.toLocaleUpperCase()}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
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
export function Cover({ book, className, imprint = "md", ribbons = true }: { book: HomeBook; className: string; imprint?: "sm" | "md" | "lg"; ribbons?: boolean }) {
    return (
        <div className={`relative overflow-hidden rounded-md bg-gray-200 shadow-sm dark:bg-dark-raised dark:shadow-none ${className}`}>
            {book.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={book.image} alt={book.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
            )}
            {ribbons && <CoverRibbons book={book} />}
            <Imprint size={imprint} />
        </div>
    );
}