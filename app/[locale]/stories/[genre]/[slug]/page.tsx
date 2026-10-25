"use client";
import { useLocale, useTranslations } from "next-intl";
import { fetchYouMayLike } from "@/lib/fetchYouMayLike";
import { languageForLocale } from "@/lib/language";
import Footer from "@/components/footer";
import { BookGrid, SectionHeader } from "@/hooks/bookData";
import { ChapterListSkeleton, TextSkeleton } from "@/components/skeleton";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaLock } from "react-icons/fa6";
import { useLibraryStore } from "@/lib/store/library-store";
import { useAuthStore } from "@/lib/store/authStore";
import BookReviews, { type ReviewSummary } from "@/components/reviews/bookReview";
import Imprint from "@/components/imprint";
import { Flag } from "lucide-react";
import ReportBookDialog from "@/components/book-controls/report-book";
import { useOptionNames } from "@/hooks/useOptionName";

const FALLBACK_COVER = "/fang_pictures/bookFace.png";

interface Book {
    id?: string | number;
    title: string;
    author: string;
    authorSlug?: string | null;   // the author's page address (null = no author page)
    views?: string;
    genre: string;
    genreSlug: string;
    tags?: string[];
    chapter?: number;     // published chapter count
    chapters: string;
    rating?: string;      // average from the reviews (see Reader Reviews)
    status?: string;      // ONGOING | COMPLETED
    image: string;
    summary?: string;
    slug: string;
    moved?: boolean;      // opened from an old link (renamed book, FS123 or id)
}

interface ChapterRow {
    id: string;
    chapter_number: number;
    title: string | null;
    isLocked: boolean;
}

const titleCase = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "");

// The site logo in the middle of a loading cover
function HeroLogo() {
    return <Image src="/fanglogo1.svg" alt="" aria-hidden="true" width={64} height={64} className="w-1/3 max-w-16 h-auto opacity-40" />;
}

// Cover with a placeholder while it loads and the default cover if it fails
function Cover({ src, alt }: { src?: string; alt: string }) {
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [src]);
    return (
        <div className="relative w-32 md:w-44 aspect-3/4 shrink-0 overflow-hidden rounded-lg shadow-xl">
            <div className="absolute inset-0 flex items-center justify-center animate-pulse bg-white/10">
                <HeroLogo />
            </div>
            <Image
                src={!src || failed ? FALLBACK_COVER : src}
                alt={alt}
                fill
                unoptimized
                sizes="176px"
                onError={() => setFailed(true)}
                className="object-cover"
            />
            <Imprint />
        </div>
    );
}

function HeroSkeleton() {
    return (
        <div className="mt-5 md:mt-6 flex items-start gap-5 md:gap-10">
            <div className="flex w-32 md:w-44 aspect-3/4 shrink-0 items-center justify-center rounded-lg animate-pulse bg-white/10">
                <HeroLogo />
            </div>
            <div className="min-w-0 flex-1 space-y-3 pt-1">
                <div className="h-7 w-2/3 rounded animate-pulse bg-white/10" />
                <div className="h-4 w-1/3 rounded animate-pulse bg-white/10" />
                <div className="h-4 w-1/2 rounded animate-pulse bg-white/10" />
                <div className="flex flex-wrap gap-2 pt-1">
                    {[12, 18, 13, 12, 22].map((w, i) => (
                        <div key={i} style={{ width: `${w * 4}px` }} className="h-5 rounded-full animate-pulse bg-white/10" />
                    ))}
                </div>
                <div className="flex gap-3 pt-3">
                    <div className="h-8 w-24 rounded-md animate-pulse bg-white/10" />
                    <div className="h-8 w-28 rounded-md animate-pulse bg-white/10" />
                </div>
            </div>
        </div>
    );
}

export default function Page() {
    const router = useRouter();
    const t = useTranslations("Book");
    const b = useTranslations("Books");
    // Genre and tag names in the site's language (the saved name when there is no translation)
    const tr = useOptionNames();
    const [book, setBook] = useState<Book | null>(null);
    const [chapters, setChapters] = useState<ChapterRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [chaptersLoading, setChaptersLoading] = useState(true);
    const [booksLoading, setBooksLoading] = useState(true);
    const { genre, slug } = useParams();
    const [active, setActive] = useState<"overview" | "contents">("overview");
    const safeSlug = Array.isArray(slug) ? slug[0] : slug;
    const safeGenre = Array.isArray(genre) ? genre[0] : genre;
    const [books, setBooks] = useState<any[]>([]);
    const [showAll, setShowAll] = useState(false);
    // The language the reader picked on the site: You May Like only shows books in it
    const language = languageForLocale(useLocale());

    // Library: saved or not (re-draws when the saved list changes), and the chapter to continue from
    const signedIn = useAuthStore((s) => Boolean(s.user));
    const toggleBook = useLibraryStore((s) => s.toggleBook);
    const bookKey = book?.slug ?? "";
    const saved = useLibraryStore((s) => Boolean(bookKey) && s.saved.some((b) => b.id === bookKey || b.storyId === String(book?.id ?? "")));
    const [savingBook, setSavingBook] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);
    const [lastChapter, setLastChapter] = useState<number | null>(null);
    // Average rating and number of reviews, from the Reader Reviews section
    const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
    const ratingText = reviewSummary?.average != null ? reviewSummary.average.toFixed(1) : book?.rating;

    // The book's current link, once it's loaded (the URL may be an old one)
    const bookPath = book ? `/stories/${book.genreSlug}/${book.slug}` : `/stories/${safeGenre}/${safeSlug}`;
    const firstChapter = chapters[0]?.chapter_number ?? 1;
    // The book's last published chapter, and whether the reader has reached it
    const finalChapter = chapters.length ? Math.max(...chapters.map((c) => Number(c.chapter_number) || 0)) : null;
    const reachedEnd = lastChapter !== null && finalChapter !== null && lastChapter >= finalChapter;
    const completed = (book?.status ?? "").toLowerCase() === "completed";
    // Completed and finished: "Read Again" from chapter 1. Ongoing and on the latest chapter: "Up to date".
    // Otherwise "Continue Reading" goes back to the last chapter opened.
    const startChapter = reachedEnd && completed ? firstChapter : lastChapter ?? firstChapter;
    const readLabel = !lastChapter
        ? t("readNow")
        : reachedEnd
            ? completed ? t("readAgain") : t("upToDate", { chapter: lastChapter })
            : t("continueReading", { chapter: lastChapter });
    const chapterCount = book?.chapter ?? (Number(book?.chapters) || chapters.length);

    // Genre first, then the tags (no repeats)
    const pills = book
        ? [book.genre, ...(book.tags ?? [])].filter((t, i, all) => t && all.findIndex((x) => x?.toLowerCase() === t.toLowerCase()) === i)
        : [];

    const paragraphs = (book?.summary ?? "").split(/\n+/).map((p) => p.trim()).filter(Boolean);

    // You May Like: the same writer's other books first, then the same genre, in the reader's language
    useEffect(() => {
        if (!safeSlug) return;
        let cancelled = false;
        setBooksLoading(true);
        fetchYouMayLike(String(safeSlug), language)
            .then((data) => { if (!cancelled) setBooks(data); })
            .catch((error) => console.log(error))
            .finally(() => { if (!cancelled) setBooksLoading(false); });
        return () => { cancelled = true; };
    }, [safeSlug, language]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            try {
                const res = await fetch(`/api/stories/${safeSlug}`);
                const data: Book | null = res.ok ? await res.json() : null;
                setBook(data);

                // Old link (renamed book, or the genre changed): switch to the current one
                if (data && (data.slug !== safeSlug || data.genreSlug !== safeGenre)) {
                    router.replace(`/stories/${data.genreSlug}/${data.slug}`);
                }
            } catch (err) {
                console.log(err);
            } finally {
                setLoading(false);
            }
        };

        if (safeSlug) fetchData();
    }, [safeSlug, safeGenre, router]);

    useEffect(() => {
        const fetchChapters = async () => {
            setChaptersLoading(true);
            try {
                const res = await fetch(`/api/stories/${safeSlug}/chapters`,
                    { credentials: "include", cache: "no-store" });
                setChapters(res.ok ? await res.json() : []);
            } catch (err) {
                console.log(err);
                setChapters([]);
            } finally {
                setChaptersLoading(false);
            }
        };
        if (safeSlug) fetchChapters();
    }, [safeSlug, signedIn]);

    useEffect(() => {
        setLastChapter(null);
        if (!signedIn || !bookKey) return;
        let cancelled = false;
        fetch(`/api/library/status?id=${encodeURIComponent(bookKey)}`, { credentials: "include", cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (!cancelled && data && typeof data.lastChapter === "number") setLastChapter(data.lastChapter);
            })
            .catch(() => { });
        return () => { cancelled = true; };
    }, [signedIn, bookKey]);

    const handleLibrary = async () => {
        if (!book || savingBook) return;
        setSavingBook(true);
        try {
            await toggleBook({ id: book.slug, title: book.title, image: book.image || FALLBACK_COVER });
        } finally {
            setSavingBook(false);
        }
    };

    // Tags and buttons: beside the cover on bigger screens, full width under it on phones
    const pillsEl = pills.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
            {pills.map((p) => (
                <span key={p} className="max-w-full truncate rounded-full bg-white/30 px-2.5 py-0.5 text-[11px] md:text-xs text-white">
                    {tr(p)}
                </span>
            ))}
        </div>
    );
    const actionsEl = (
        <div className="mt-6 md:mt-8 flex gap-3">
            <Link
                href={`${bookPath}/reader?chapter=${startChapter}`}
                className="flex-1 md:flex-none rounded-md bg-red-600 px-6 md:px-7 py-2 text-center text-[11px] md:text-xs font-semibold text-white hover:bg-red-700">
                {readLabel}
            </Link>
            <button
                type="button"
                onClick={handleLibrary}
                disabled={savingBook}
                className={`flex-1 md:flex-none rounded-md border px-5 md:px-6 py-2 text-[11px] md:text-xs font-semibold disabled:opacity-60 ${saved
                    ? "border-red-600 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/15"
                    : "border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-black dark:text-white hover:bg-gray-100 dark:hover:bg-dark-raised"
                    }`}>
                {saved ? t("inLibrary") : t("addToLibrary")}
            </button>

            <button
                type="button"
                onClick={() => setReportOpen(true)}
                aria-label={t("reportBook")}
                title={t("reportBook")}
                className="flex shrink-0 items-center justify-center rounded-md border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card px-3 text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-dark-raised hover:text-red-600">
                <Flag size={14} />
            </button>
        </div>
    );

    return (
        <div className="bg-white dark:bg-dark">
            {/* HERO */}
            <section className="relative overflow-hidden bg-gray-900">
                {book && (
                    <Image
                        src={book.image || FALLBACK_COVER}
                        alt=""
                        aria-hidden
                        fill
                        unoptimized
                        sizes="100vw"
                        className="object-cover object-top scale-110 blur-lg"
                    />
                )}
                {/* darker behind the text, a little darker at the bottom */}
                <div className="absolute inset-0 bg-linear-to-r from-black/30 via-black/30 to-black/5" />
                <div className="absolute inset-0 bg-linear-to-b from-black/20 via-transparent to-black/50" />

                <div className="relative mx-auto max-w-6xl px-4 md:px-8 pt-5 md:pt-6 pb-10 md:pb-14">
                    <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] md:text-[11px] text-white/80">
                        <Link href="/" className="hover:text-white">{t("home")}</Link>
                        <span>/</span>
                        <span>{book?.genre ? tr(book.genre) : safeGenre}</span>
                        <span>/</span>
                        {loading ? (
                            <span className="h-3 w-28 rounded animate-pulse bg-white/10" />
                        ) : (
                            <span className="font-semibold text-white">{book?.title}</span>
                        )}
                    </nav>

                    {loading ? (
                        <HeroSkeleton />
                    ) : book ? (
                        <>
                            <div className="mt-5 md:mt-6 flex items-start gap-5 md:gap-10">
                                <Cover src={book.image} alt={book.title} />

                                <div className="min-w-0 pt-1 md:pt-2">
                                    <h1 className="line-clamp-2 text-lg md:text-[26px] font-bold text-white leading-tight">{book.title}</h1>

                                    <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs md:text-[15px] text-white/50">
                                        {book.author && (
                                            <p>{t.rich("writtenBy", {
                                                author: book.author, name: (chunks) => book.authorSlug
                                                    ? <Link href={`/authors/${book.authorSlug}`} className="text-red-600 hover:underline">{chunks}</Link>
                                                    : <span className="text-red-600">{chunks}</span>
                                            })}</p>)}
                                        {book.status && <><span>•</span><span>{completed ? b("completed") : book.status.toLowerCase() === "ongoing" ? b("ongoing") : titleCase(book.status)}</span></>}
                                    </div>

                                    {/* Phones: one stat per line, so the text stays no taller than the cover */}
                                    <div className="mt-2 flex flex-col items-start gap-y-0.5 text-xs text-white/85 md:mt-2.5 md:flex-row md:flex-wrap md:items-center md:gap-x-2.5 md:gap-y-1 md:text-[15px]">
                                        <span>👁️ {t("views", { views: book.views ?? 0 })}</span>
                                        <span className="hidden md:inline">•</span>
                                        <span>📚 {t("chapters", { count: chapterCount })}</span>
                                        {ratingText && (
                                            <>
                                                <span className="hidden md:inline">•</span>
                                                <span>⭐ {t("rating", { rating: ratingText })}</span>
                                            </>
                                        )}
                                    </div>

                                    {/* Bigger screens: tags and buttons beside the cover (phones: under it, below) */}
                                    <div className="hidden md:block">
                                        {pillsEl}
                                        {actionsEl}
                                    </div>
                                </div>
                            </div>

                            {/* Phones: tags and buttons full width under the cover */}
                            <div className="md:hidden">
                                {pillsEl}
                                {actionsEl}
                            </div>
                        </>
                    ) : (
                        <p className="mt-6 text-white/80">{t("notFound")}</p>
                    )}
                </div>
            </section>

            {/* BODY */}
            <div className="mx-auto max-w-7xl px-4 md:px-8 pt-6 md:pt-8 text-gray-800 dark:text-neutral-200">
                <div className="flex gap-8 border-b border-gray-200 dark:border-dark-border">
                    <button
                        onClick={() => setActive("overview")}
                        className={`-mb-px pb-2 text-sm ${active === "overview" ? "border-b-2 border-red-600 font-semibold text-black dark:text-white" : "text-gray-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"}`}>
                        {t("overview")}
                    </button>
                    <button
                        onClick={() => setActive("contents")}
                        className={`-mb-px pb-2 text-sm ${active === "contents" ? "border-b-2 border-red-600 font-semibold text-black dark:text-white" : "text-gray-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"}`}>
                        {t("contents")}{!chaptersLoading && ` (${chapters.length})`}
                    </button>
                </div>

                <div className="pt-5">
                    {active === "overview" && (
                        loading ? (
                            <TextSkeleton lines={5} />
                        ) : (
                            <div className="space-y-4 text-sm leading-relaxed text-gray-700 dark:text-neutral-300">
                                {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
                            </div>
                        )
                    )}

                    {active === "contents" && (
                        chaptersLoading ? (
                            <ChapterListSkeleton />
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
                                    {(showAll ? chapters : chapters.slice(0, 18)).map((chapter) => (
                                        // Locked chapters open too: the reader shows the preview and the unlock card
                                        <Link
                                            key={chapter.id}
                                            href={`${bookPath}/reader?chapter=${chapter.chapter_number}`}
                                            className={`flex items-center gap-3 rounded p-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-card ${chapter.isLocked ? "opacity-60" : ""}`}>
                                            {chapter.isLocked && <FaLock className="text-xs text-gray-500 dark:text-neutral-400" />}
                                            <span className="truncate">
                                                {chapter.title
                                                    ? t("chapterTitled", { chapter: chapter.chapter_number, title: chapter.title })
                                                    : b("chapterN", { chapter: chapter.chapter_number })}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                                {chapters.length > 18 && (
                                    <div className="mt-4 flex justify-center">
                                        <button onClick={() => setShowAll((prev) => !prev)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-100 dark:border-dark-border dark:hover:bg-dark-card">
                                            {showAll ? t("showLess") : t("showMore")}
                                        </button>
                                    </div>
                                )}
                            </>
                        )
                    )}
                </div>

                {/* YOU MAY LIKE */}
                <section className="mt-10 md:mt-12">
                    <SectionHeader title={t("youMayLike")} href={`/stories/${book?.genreSlug || safeGenre}`} />
                    <BookGrid data={books} loading={booksLoading} />
                </section>

                {/* READER REVIEWS */}
                {book ? (
                    <BookReviews bookId={book.slug} onSummary={setReviewSummary} />
                ) : (
                    <section className="mt-10 md:mt-12 pb-12 md:pb-20">
                        <h2 className="text-sm md:text-base font-semibold text-gray-700 dark:text-neutral-300">{t("readerReviews")}</h2>
                    </section>
                )}
            </div>
            {book && (
                <ReportBookDialog
                    open={reportOpen}
                    onClose={() => setReportOpen(false)}
                    book={{ slug: book.slug, title: book.title, author: book.author, image: book.image }}
                />
            )}
            <Footer />

        </div>
    );
}