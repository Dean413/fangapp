"use client"
import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/footer";
import { Bone } from "@/components/skeleton";
import { CloudCheck, Droplets, Eye, ListFilter, Star, TrendingUp, Zap } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { FaBookmark, FaRegBookmark, FaRegEye } from "react-icons/fa";
import { useLibraryStore } from "@/lib/store/library-store";
import { useOptionNames } from "@/hooks/useOptionName";
import { Suspense, useEffect, useRef, useState } from "react";

const FALLBACK_COVER = "/fang_pictures/bookFace.png";

type Period = "daily" | "weekly" | "monthly" | "all_round";
type Audience = "male" | "female";
type NovelType = "long" | "short";
type RankingList = { id: string; name: string };
type RankType = { id: string; name: string; lists: RankingList[] };

// Each option's label is its message under Rankings
const PERIODS: { value: Period; label: string }[] = [
    { value: "daily", label: "daily" },
    { value: "weekly", label: "weekly" },
    { value: "monthly", label: "monthly" },
    { value: "all_round", label: "allRound" },
];

const AUDIENCES: { value: Audience; label: string }[] = [
    { value: "male", label: "male" },
    { value: "female", label: "female" },
];

const NOVEL_TYPES: { value: NovelType; label: string }[] = [
    { value: "long", label: "longNovel" },
    { value: "short", label: "shorties" },
];

const DEFAULT_PERIOD: Period = "daily";

// Phone: the icon of each rank type in the left rail, by its position (repeats if there are more types)
const TYPE_ICONS = [Zap, TrendingUp, Droplets, CloudCheck];

// Read a filter from the link, ignoring anything that isn't one of its options
function fromLink<T extends string>(value: string | null, options: { value: T }[]): T | null {
    return options.some((o) => o.value === value) ? (value as T) : null;
}

const bookPath = (b: any) => `/stories/${b.genreSlug || "all"}/${b.slug}`;
const readPath = (b: any) => `${bookPath(b)}/reader?chapter=1`;

// Cover that falls back to the default cover if it's missing or fails to load
function Cover({ src, alt, sizes }: { src?: string; alt: string; sizes: string }) {
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [src]);
    return (
        <>
            <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-dark-raised" />
            <Image
                src={!src || failed ? FALLBACK_COVER : src}
                alt={alt}
                fill
                sizes={sizes}
                onError={() => setFailed(true)}
                className="object-cover"
            />
        </>
    );
}

function Views({ views }: { views?: string }) {
    if (!views) return null;
    return (
        <span className="inline-flex items-center gap-1">
            <FaRegEye className="text-[0.95em]" /> {views}
        </span>
    );
}

const secondTag = (book: any) =>
    (book.tags ?? []).find((t: string) => t && t.toLowerCase() !== String(book.genre).toLowerCase());

function Chips({ book }: { book: any }) {
    const tag = secondTag(book);
    return (
        <div className="flex flex-wrap gap-1">
            {book.genre && (
                <span className="rounded bg-red-50 dark:bg-red-500/15 px-1.5 py-0.5 text-[9px] md:text-[10px] font-medium text-red-600 dark:text-red-300">
                    {book.genre}
                </span>
            )}
            {tag && (
                <span className="rounded bg-gray-100 dark:bg-dark-raised px-1.5 py-0.5 text-[9px] md:text-[10px] text-gray-600 dark:text-neutral-300">
                    {tag}
                </span>
            )}
        </div>
    );
}

// Bookmark: adds the book to the reader's library, or takes it out (the store shows the message,
// and the sign-in card when signed out)
function LibraryButton({ book, iconClass = "text-sm" }: { book: any; iconClass?: string }) {
    const toggleBook = useLibraryStore((s) => s.toggleBook);
    const saved = useLibraryStore((s) => s.saved.some((b) => b.id === book.slug || b.storyId === String(book.id)));
    const [busy, setBusy] = useState(false);
    const t = useTranslations("Rankings");

    const toggle = async () => {
        if (busy) return;
        setBusy(true);
        try {
            await toggleBook({ id: book.slug, title: book.title, image: book.image || FALLBACK_COVER });
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            onClick={toggle}
            disabled={busy}
            aria-label={saved ? t("removeFromLibrary") : t("addToLibrary")}
            aria-pressed={saved}
            className={`p-1 disabled:opacity-50 ${saved ? "text-red-600" : "text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-neutral-200"}`}>
            {saved ? <FaBookmark className={iconClass} /> : <FaRegBookmark className={iconClass} />}
        </button>
    );
}

function Actions({ book, className = "" }: { book: any; className?: string }) {
    const t = useTranslations("Rankings");
    return (
        <div className={`flex shrink-0 items-center gap-2 ${className}`}>
            <Link
                href={readPath(book)}
                className="rounded-full bg-red-600 px-3 md:px-4 py-1.5 text-[10px] md:text-xs font-semibold text-white hover:bg-red-700">
                {t("readNow")}
            </Link>
            <LibraryButton book={book} />
        </div>
    );
}

// Each new pick fades in
const FADE_CSS = "@keyframes fangRankFade { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }";

// The big card under the top 4
function FeaturedCard({ book }: { book: any }) {
    const genreLine = [book.genre, secondTag(book)].filter(Boolean).join(" · ");
    const t = useTranslations("Rankings");

    return (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card p-4 md:p-5">
            <div className="min-w-0">
                {genreLine && (
                    <p className="text-[10px] md:text-xs font-bold uppercase tracking-wide text-red-600">{genreLine}</p>
                )}
                <Link href={bookPath(book)} className="mt-1 block text-lg md:text-2xl font-bold text-black dark:text-white hover:text-red-600">
                    {book.title}
                </Link>
                <p className="mt-1 text-xs md:text-sm text-gray-500 dark:text-neutral-400">
                    {t("byLine", { author: book.author, count: book.chapter })}
                </p>
                <div className="mt-2 flex items-center gap-3 text-[11px] md:text-xs text-gray-500 dark:text-neutral-400">
                    <Views views={book.views} />
                    {book.rating && <span className="text-yellow-500">★ <span className="text-gray-500 dark:text-neutral-400">{book.rating}</span></span>}
                </div>
                {book.summary && (
                    <p className="mt-2 line-clamp-4 text-xs md:text-sm leading-relaxed text-gray-500 dark:text-neutral-400">{book.summary}</p>
                )}
            </div>
            <Actions book={book} />
        </div>
    );
}

// One row of the full rankings. The text never runs taller than the cover:
// the text column fills the cover's height and the blurb is cut to fit.
function RankRow({ book, rank }: { book: any; rank: number }) {
    const t = useTranslations("Rankings");
    return (
        <div className="flex items-start gap-3 md:gap-4 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card p-3 md:p-4">
            <span className="w-7 md:w-10 shrink-0 text-center text-2xl md:text-4xl font-black italic text-gray-200 dark:text-neutral-800">
                {rank}
            </span>

            <Link href={bookPath(book)} className="relative w-20 md:w-24 aspect-3/4 shrink-0 overflow-hidden rounded">
                <Cover src={book.image} alt={book.title} sizes="96px" />
            </Link>

            {/* Same height as the cover (from sm up); on phones the text flows and the actions sit below it */}
            <div className="relative min-w-0 flex-1 sm:self-stretch">
                <div className="flex flex-col sm:absolute sm:inset-0 sm:overflow-hidden">
                    <Chips book={book} />
                    <Link href={bookPath(book)} className="mt-1 block text-sm md:text-base font-bold leading-5 md:leading-6 text-black dark:text-white hover:text-red-600 line-clamp-2 sm:line-clamp-1">
                        {book.title}
                    </Link>
                    <p className="truncate text-[10px] md:text-[11px] text-gray-500 dark:text-neutral-400">
                        {t("byLine", { author: book.author, count: book.chapter })}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-gray-500 dark:text-neutral-400">
                        <Views views={book.views} />
                        {book.rating && <span className="text-yellow-500">★ <span className="text-gray-500 dark:text-neutral-400">{book.rating}</span></span>}
                    </div>
                    {book.summary && (
                        <p className="mt-1 min-h-0 line-clamp-1 md:line-clamp-2 text-[11px] md:text-xs leading-snug text-gray-600 dark:text-neutral-400">
                            {book.summary}
                        </p>
                    )}
                    <Actions book={book} className="mt-2 sm:hidden" />
                </div>
            </div>

            <Actions book={book} className="hidden sm:flex" />
        </div>
    );
}

// Phone: one ranked book. The cover has the rank on it; the text column is exactly as tall as the cover
function MobileRankCard({ book, rank }: { book: any; rank: number }) {
    const t = useTranslations("Rankings");
    // Genre and tag names in the site's language
    const tr = useOptionNames();
    const tag = secondTag(book);

    return (
        <div className="flex gap-3 py-3">
            <Link href={bookPath(book)} className="relative w-24 aspect-3/4 shrink-0 overflow-hidden rounded-md">
                <Cover src={book.image} alt={book.title} sizes="96px" />
                <span className="absolute bottom-1.5 left-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/70 font-serif text-sm font-bold text-gray-800">
                    {rank}
                </span>
            </Link>

            <div className="relative min-w-0 flex-1 self-stretch">
                <div className="absolute inset-0 flex flex-col overflow-hidden">
                    {/* Bookmark, top right */}
                    <div className="absolute right-0 top-0 z-10">
                        <LibraryButton book={book} iconClass="text-xl" />
                    </div>

                    {/* Genre and tag: one line, cut with "…" */}
                    <div className="flex flex-nowrap items-center gap-1.5 overflow-hidden pr-8">
                        {book.genre && (
                            <span className="min-w-0 shrink truncate rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-500/15 dark:text-red-300">
                                {tr(book.genre)}
                            </span>
                        )}
                        {tag && (
                            <span className="min-w-0 shrink truncate rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-neutral-200 dark:text-neutral-900">
                                {tr(tag)}
                            </span>
                        )}
                    </div>

                    <Link href={bookPath(book)} className="mt-1 line-clamp-1 text-base font-medium leading-snug text-gray-900 hover:text-red-600 dark:text-white">
                        {book.title}
                    </Link>
                    <p className="truncate text-xs text-gray-500 dark:text-neutral-400">
                        {t("byLine", { author: book.author, count: book.chapter })}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-neutral-400">
                        {book.views && (
                            <span className="inline-flex items-center gap-1"><Eye size={14} /> {book.views}</span>
                        )}
                        {book.rating && (
                            <span className="inline-flex items-center gap-1">
                                <Star size={12} className="fill-amber-400 text-amber-400" /> {book.rating}
                            </span>
                        )}
                    </div>
                    {book.summary && (
                        <p className="mt-1 min-h-0 line-clamp-2 text-xs leading-snug text-gray-700 dark:text-neutral-300">
                            &quot;{book.summary}&quot;
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

function MobileSkeleton() {
    return (
        <div>
            {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex gap-4 py-4">
                    <Bone className="w-24 aspect-3/4 rounded-md shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Bone className="h-4 w-1/2" />
                        <Bone className="h-5 w-3/4" />
                        <Bone className="h-3 w-2/3" />
                        <Bone className="h-3 w-full" />
                        <Bone className="h-3 w-4/5" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// One "Filter by …" group of radio options. Clicking the picked option again turns it off
// (unless the group always needs a value, like the time period).
function RadioGroup<T extends string>({ title, options, value, onChange, required = false }: {
    title: string;
    options: { value: T; label: string }[];
    value: T | null;
    onChange: (value: T | null) => void;
    required?: boolean;
}) {
    const t = useTranslations("Rankings");
    return (
        <div role="radiogroup" aria-label={title} className="py-3 first:pt-0 last:pb-0">
            <p className="mb-1 text-sm font-medium text-gray-500 dark:text-neutral-400">{title}</p>
            {options.map((o) => {
                const on = o.value === value;
                return (
                    <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => onChange(on && !required ? null : o.value)}
                        className="flex w-full items-center gap-3 py-2 text-left">
                        <span
                            className={`h-5 w-5 shrink-0 rounded-full ${on
                                ? "border-[6px] border-black dark:border-white"
                                : "border-2 border-gray-800 dark:border-neutral-500"}`}
                        />
                        <span className="text-[15px] font-medium text-gray-500 dark:text-neutral-300">{t(o.label)}</span>
                    </button>
                );
            })}
        </div>
    );
}

function BooksSkeleton() {
    return (
        <>
            <div className="grid grid-cols-4 gap-2 md:gap-4">
                {Array.from({ length: 4 }, (_, i) => <Bone key={i} className="aspect-3/4 rounded-md" />)}
            </div>
            <div className="mt-4 rounded-lg border border-gray-200 dark:border-dark-border p-4 md:p-5 space-y-2.5">
                <Bone className="h-3 w-32" />
                <Bone className="h-6 w-1/2" />
                <Bone className="h-3 w-40" />
                <Bone className="h-3 w-full" />
                <Bone className="h-3 w-5/6" />
            </div>
            <Bone className="mt-10 h-4 w-28" />
            <div className="mt-4 space-y-3">
                {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="flex gap-3 md:gap-4 rounded-xl border border-gray-200 dark:border-dark-border p-3 md:p-4">
                        <Bone className="w-7 md:w-10 h-8" />
                        <Bone className="w-20 md:w-24 aspect-3/4 rounded" />
                        <div className="flex-1 space-y-2">
                            <Bone className="h-3 w-24" />
                            <Bone className="h-4 w-1/2" />
                            <Bone className="h-3 w-1/3" />
                            <Bone className="h-3 w-full" />
                            <Bone className="h-3 w-4/5" />
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

const Message = ({ children }: { children: React.ReactNode }) => (
    <p className="py-16 text-center text-sm text-gray-500 dark:text-neutral-400">{children}</p>
);

const RankingsPage = () => {
    const locale = useLocale();
    const t = useTranslations("Rankings");
    const searchParams = useSearchParams();

    // Filters live in the link: ?period=weekly&audience=male&type=short
    const period = fromLink(searchParams.get("period"), PERIODS) ?? DEFAULT_PERIOD;
    const audience = fromLink(searchParams.get("audience"), AUDIENCES);
    const novelType = fromLink(searchParams.get("type"), NOVEL_TYPES);
    const hasFilters = period !== DEFAULT_PERIOD || audience !== null || novelType !== null;

    // Change one filter: only the link changes (no page load); unset filters are left out of it
    const setFilter = (name: "period" | "audience" | "type", value: string | null) => {
        const url = new URL(window.location.href);
        if (value === null || (name === "period" && value === DEFAULT_PERIOD)) url.searchParams.delete(name);
        else url.searchParams.set(name, value);
        window.history.pushState(null, "", url.toString());
    };

    const clearFilters = () => {
        const url = new URL(window.location.href);
        ["period", "audience", "type"].forEach((name) => url.searchParams.delete(name));
        window.history.pushState(null, "", url.toString());
    };

    const [filtersOpen, setFiltersOpen] = useState(false);

    // Tabs (rank types) and their lists, from the admin's Ranking curation
    const [rankTypes, setRankTypes] = useState<RankType[]>([]);
    const [typesLoading, setTypesLoading] = useState(true);
    const [typesFailed, setTypesFailed] = useState(false);
    const [typeId, setTypeId] = useState("");
    const [listId, setListId] = useState("");

    // The picked list's books
    const [books, setBooks] = useState<any[]>([]);
    const [booksLoading, setBooksLoading] = useState(false);
    const [booksFailed, setBooksFailed] = useState(false);
    const [featuredIndex, setFeaturedIndex] = useState(0);

    const cache = useRef(new Map<string, any[]>());
    const latest = useRef("");

    // Rank types + lists for this language and period
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setTypesLoading(true);
            setTypesFailed(false);
            try {
                const res = await fetch(`/api/rankings?locale=${encodeURIComponent(locale)}&period=${period}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const types: RankType[] = (await res.json()).data ?? [];
                if (cancelled) return;
                setRankTypes(types);

                // Keep the picked tab if it still has lists, else the first tab that has any
                setTypeId((current) => {
                    const keep = types.find((t) => t.id === current && t.lists.length > 0);
                    return (keep ?? types.find((t) => t.lists.length > 0) ?? types[0])?.id ?? "";
                });
            } catch (error) {
                console.log(error);
                if (!cancelled) setTypesFailed(true);
            } finally {
                if (!cancelled) setTypesLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [locale, period]);

    const activeType = rankTypes.find((t) => t.id === typeId);

    // Picking a tab (or new lists arriving) selects that tab's first list, unless the current one is still there
    useEffect(() => {
        const lists = activeType?.lists ?? [];
        setListId((current) => (lists.some((l) => l.id === current) ? current : lists[0]?.id ?? ""));
    }, [activeType]);

    // Books of the picked list; reading preference and novel type only apply once picked
    useEffect(() => {
        const key = `${listId}|${audience ?? ""}|${novelType ?? ""}`;
        latest.current = key;
        setFeaturedIndex(0);
        if (!listId) {
            setBooks([]);
            return;
        }

        const cached = cache.current.get(key);
        if (cached) {
            setBooks(cached);
            setBooksLoading(false);
            setBooksFailed(false);
            return;
        }

        const load = async () => {
            setBooksLoading(true);
            setBooksFailed(false);
            try {
                const query = new URLSearchParams();
                if (audience) query.set("audience", audience);
                if (novelType) query.set("type", novelType);
                const res = await fetch(`/api/rankings/${listId}${query.size ? `?${query}` : ""}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = (await res.json()).data ?? [];
                cache.current.set(key, data);
                if (latest.current === key) setBooks(data);
            } catch (error) {
                console.log(error);
                if (latest.current === key) setBooksFailed(true);
            } finally {
                if (latest.current === key) setBooksLoading(false);
            }
        };
        load();
    }, [listId, audience, novelType]);

    const top = books.slice(0, 4);
    const featured = top[featuredIndex] ?? top[0];
    const rest = books.slice(4);
    const loading = typesLoading || booksLoading;

    // The filter button and its panel (used by the desktop tab row and the phone heading)
    const filterControl = (
        <div className="relative shrink-0">
            <button
                type="button"
                aria-label={t("filters")}
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen((o) => !o)}
                className={`relative rounded border p-1.5 ${filtersOpen || hasFilters
                    ? "border-red-600 text-red-600"
                    : "border-gray-200 dark:border-dark-border text-gray-500 hover:text-black dark:text-neutral-400 dark:hover:text-white"}`}>
                <ListFilter size={14} />
                {hasFilters && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-600" />}
            </button>

            {filtersOpen && (
                <>
                    <button type="button" aria-label={t("closeFilters")} className="fixed inset-0 z-10 cursor-default" onClick={() => setFiltersOpen(false)} />
                    <div className="absolute right-0 top-full z-20 mt-2 w-72 md:w-80 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card p-5 shadow-xl">
                        <div className="mb-3 flex items-baseline justify-between">
                            <h3 className="font-serif text-2xl md:text-3xl font-bold text-black dark:text-white">{t("filters")}</h3>
                            {hasFilters && (
                                <button type="button" onClick={clearFilters} className="text-xs font-medium text-red-600 hover:underline">
                                    {t("clear")}
                                </button>
                            )}
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-dark-border">
                            <RadioGroup title={t("filterTime")} options={PERIODS} value={period} required onChange={(v) => setFilter("period", v)} />
                            <RadioGroup title={t("filterPreference")} options={AUDIENCES} value={audience} onChange={(v) => setFilter("audience", v)} />
                            <RadioGroup title={t("filterType")} options={NOVEL_TYPES} value={novelType} onChange={(v) => setFilter("type", v)} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );

    return (
        <>
            <div className="min-h-screen bg-white dark:bg-dark">

                {/* PHONE: lists on top, rank types in the left rail, one numbered list */}
                <div className="md:hidden px-4 pt-4 pb-12">
                    {(activeType?.lists.length ?? 0) > 0 && (
                        <div className="no-scrollbar -mx-4 flex items-center gap-4 overflow-x-auto border-b border-gray-200 px-4 py-4 dark:border-dark-border">
                            {activeType!.lists.map((l) => (
                                <button
                                    key={l.id}
                                    type="button"
                                    onClick={() => setListId(l.id)}
                                    className={`shrink-0 whitespace-nowrap rounded-full px-6 py-2 text-lg ${listId === l.id
                                        ? "bg-red-600 font-semibold text-white shadow-lg shadow-red-600/30"
                                        : "font-medium text-gray-500 dark:text-neutral-400"}`}>
                                    {l.name}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="mt-4 flex gap-3">
                        {/* Rank types */}
                        <div className="flex w-12 shrink-0 flex-col gap-2 self-start">
                            {rankTypes.map((rt, i) => {
                                const Icon = TYPE_ICONS[i % TYPE_ICONS.length];
                                const on = rt.id === typeId;
                                return (
                                    <button
                                        key={rt.id}
                                        type="button"
                                        title={rt.name}
                                        aria-label={rt.name}
                                        aria-pressed={on}
                                        onClick={() => setTypeId(rt.id)}
                                        className={`flex h-12 w-12 items-center justify-center rounded-lg ${on
                                            ? "bg-gray-100 text-red-600 dark:bg-dark-raised"
                                            : "text-gray-900 dark:text-white"}`}>
                                        <Icon size={26} />
                                    </button>
                                );
                            })}
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="truncate text-lg font-semibold text-red-600">{activeType?.name}</h2>
                                {filterControl}
                            </div>

                            <div className="mt-2">
                                {loading ? (
                                    <MobileSkeleton />
                                ) : typesFailed || booksFailed ? (
                                    <Message>{t("loadFailed")}</Message>
                                ) : rankTypes.length === 0 ? (
                                    <Message>{t("comingSoon")}</Message>
                                ) : !listId ? (
                                    <Message>{t(`empty_${period}`)}</Message>
                                ) : books.length === 0 ? (
                                    <Message>{t("noMatch")}</Message>
                                ) : (
                                    books.map((book, i) => <MobileRankCard key={book.id} book={book} rank={i + 1} />)
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* DESKTOP: unchanged */}
                <div className="hidden md:block mx-auto w-full max-w-6xl px-4 md:px-6 pt-8 md:pt-12 pb-12 md:pb-20">

                    {/* Tabs (rank types) + filters */}
                    <div className="relative flex items-end justify-between border-b border-gray-200 dark:border-dark-border">
                        <div className="no-scrollbar flex gap-5 md:gap-8 overflow-x-auto">
                            {typesLoading && rankTypes.length === 0
                                ? Array.from({ length: 5 }, (_, i) => <Bone key={i} className="mb-2.5 h-4 w-20" />)
                                : rankTypes.map((t) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setTypeId(t.id)}
                                        className={`-mb-px shrink-0 whitespace-nowrap pb-2.5 text-xs md:text-sm ${typeId === t.id
                                            ? "border-b-2 border-red-600 font-medium text-red-600"
                                            : "text-gray-500 hover:text-black dark:text-neutral-400 dark:hover:text-white"}`}>
                                        {t.name}
                                    </button>
                                ))}
                        </div>

                        <div className="mb-2 ml-3 shrink-0">{filterControl}</div>
                    </div>

                    {/* Lists under the picked tab */}
                    {(activeType?.lists.length ?? 0) > 0 && (
                        <div className="no-scrollbar mt-5 flex items-center gap-2 md:gap-4 overflow-x-auto">
                            {activeType!.lists.map((l) => (
                                <button
                                    key={l.id}
                                    type="button"
                                    onClick={() => setListId(l.id)}
                                    className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1 text-[11px] md:text-xs ${listId === l.id
                                        ? "bg-red-600 font-medium text-white"
                                        : "text-gray-600 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400"}`}>
                                    {l.name}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="mt-10 md:mt-14">
                        {loading ? (
                            <BooksSkeleton />
                        ) : typesFailed || booksFailed ? (
                            <Message>{t("loadFailed")}</Message>
                        ) : rankTypes.length === 0 ? (
                            <Message>{t("comingSoon")}</Message>
                        ) : !listId ? (
                            <Message>{t(`empty_${period}`)}</Message>
                        ) : books.length === 0 ? (
                            <Message>{t("noMatch")}</Message>
                        ) : (
                            <>
                                {/* Top 4: the picked one pops forward, the others step back and fade */}
                                <div className="grid grid-cols-4 gap-2 md:gap-4 py-3 md:py-5">
                                    {top.map((book, i) => {
                                        const picked = i === featuredIndex;
                                        return (
                                            <button
                                                key={book.id}
                                                type="button"
                                                onClick={() => setFeaturedIndex(i)}
                                                aria-pressed={picked}
                                                aria-label={t("rankLabel", { rank: i + 1, title: book.title })}
                                                className={`relative aspect-3/4 overflow-hidden rounded-md transition-all duration-300 ease-out ${picked
                                                    ? "z-10 scale-105 md:scale-110 opacity-100 shadow-2xl ring-2 ring-red-600"
                                                    : "scale-95 opacity-50 brightness-75 hover:opacity-80 hover:brightness-90"}`}>
                                                <Cover src={book.image} alt={book.title} sizes="(min-width: 768px) 220px, 25vw" />
                                                <span className="absolute bottom-1.5 left-1.5 md:bottom-3 md:left-3 flex h-7 w-7 md:h-12 md:w-12 items-center justify-center rounded-full bg-white/70 font-serif text-base md:text-3xl font-bold text-gray-800">
                                                    {i + 1}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* The picked book (fades in on each pick) */}
                                {featured && (
                                    <div key={featured.id} className="mt-6 animate-[fangRankFade_400ms_ease-out]">
                                        <style>{FADE_CSS}</style>
                                        <FeaturedCard book={featured} />
                                    </div>
                                )}

                                {/* Full rankings (from #5) */}
                                {rest.length > 0 && (
                                    <>
                                        <h2 className="mt-10 md:mt-14 border-b border-gray-200 dark:border-dark-border pb-2 font-serif text-sm md:text-base font-bold text-black dark:text-white">
                                            {t("fullRankings")}
                                        </h2>
                                        <div className="mt-4 space-y-3">
                                            {rest.map((book, i) => (
                                                <RankRow key={book.id} book={book} rank={i + 5} />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
};

// useSearchParams needs a Suspense boundary in Next 16
const Rankings = () => (
    <Suspense fallback={<div className="min-h-screen bg-white dark:bg-dark" />}>
        <RankingsPage />
    </Suspense>
);

export default Rankings;