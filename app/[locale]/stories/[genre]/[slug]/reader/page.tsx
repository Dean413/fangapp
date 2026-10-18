"use client";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Footer from "@/components/footer";
import ReadingSettings from "@/components/book-controls/reader-settings";
import SettingsSheets from "@/components/book-controls/settings";
import { READER_FONTS, readerFontClass, readerFontFamily } from "@/components/book-controls/reader-fonts";
import { Button } from "@/components/Button";
import TocSheet from "@/components/book-controls/table-of-contents";
import { useRewardTimers } from "@/components/profile-components/wallet-cards/reading-time-tracker";
import GiftCard from "@/components/book-controls/gift";
import ReplyPanel from "@/components/book-controls/reply";
import ChapterContent from "@/components/reader/chapter-content";
import { ChapterSkeleton, ReaderSkeleton } from "@/components/skeleton";
import { useAuthStore } from "@/lib/store/authStore";
import { fetchStories } from "@/lib/fetch-stories";
import { BookGrid, SectionHeader } from "@/hooks/bookData";

const FALLBACK_COVER = "/fang_pictures/bookFace.png";
// The reader's own display choices (theme, font, size), kept in this browser
const SETTINGS_KEY = "fang-reader-settings";
// The reading theme used when the site is in dark mode
const SITE_DARK_THEME = "black";

type ReaderSettings = { fontSize: number; theme: string; fontFamily: string };

// Reader themes (picked in the reading settings). muted = small grey text, line = dividers.
const THEMES: Record<string, { box: string; muted: string; faint: string; line: string }> = {
    light: { box: "bg-white text-black", muted: "text-gray-500", faint: "text-gray-400", line: "border-gray-300" },
    sepia: { box: "bg-[#f4ecd8] text-black", muted: "text-gray-600", faint: "text-gray-500", line: "border-[#d9ccb0]" },
    dark: { box: "bg-gray-900 text-white", muted: "text-gray-400", faint: "text-gray-500", line: "border-gray-700" },
    black: { box: "bg-black text-white", muted: "text-gray-400", faint: "text-gray-500", line: "border-gray-800" },
};

// Reader themes that turn the popups dark too
const DARK_THEMES = new Set(["dark", "black"]);

// A picked font wins over fonts written into the chapter's own HTML (from the writer's editor)
const FORCE_FONT_CSS = `.reader-font, .reader-font * { font-family: var(--reader-font) !important; }`;

// Is the site in dark mode? (the "dark" class on <html>, which the site's theme toggle sets)
function siteIsDark() {
    if (typeof window === "undefined") return false;
    const html = document.documentElement.classList;
    if (html.contains("dark")) return true;
    if (html.contains("light")) return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

// The choices saved earlier in this browser, if they're valid
function savedSettings(): Partial<ReaderSettings> | null {
    try {
        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
        if (!saved || typeof saved !== "object") return null;
        const out: Partial<ReaderSettings> = {};
        const size = Number(saved.fontSize);
        if (Number.isFinite(size) && size >= 14 && size <= 30) out.fontSize = size;
        if (typeof saved.theme === "string" && THEMES[saved.theme]) out.theme = saved.theme;
        if (READER_FONTS.some((f) => f.id === saved.fontFamily)) out.fontFamily = saved.fontFamily;
        return out;
    } catch {
        return null;
    }
}

// Book cover, loaded straight from its URL (S3), with a placeholder while loading
// and the default cover if it's missing or fails to load
function Cover({ src }: { src?: string | null }) {
    const [failed, setFailed] = useState(false);
    const [loaded, setLoaded] = useState(false);
    useEffect(() => { setFailed(false); setLoaded(false); }, [src]);

    return (
        <div className="relative w-40 h-45 rounded-md overflow-hidden">
            {!loaded && <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-dark-raised" />}
            <Image
                src={!src || failed ? FALLBACK_COVER : src}
                alt="book cover"
                width={120}
                height={180}
                unoptimized
                onLoad={() => setLoaded(true)}
                onError={() => { setFailed(true); setLoaded(true); }}
                className="relative w-40 h-45 object-cover"
            />
        </div>
    );
}

export default function ReaderPage() {
    const params = useParams();
    const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
    const genre = Array.isArray(params.genre) ? params.genre[0] : params.genre;
    const searchParams = useSearchParams();
    const [openSettings, setOpenSettings] = useState(false);
    const [settings, setSettings] = useState<ReaderSettings>({ fontSize: 18, theme: "light", fontFamily: "default" });
    const [openToc, setOpenToc] = useState(false)
    const [openGift, setOpenGift] = useState(false)
    const chapterNumber = Number(searchParams.get("chapter") || 1);
    const [chapters, setChapters] = useState<any>(null);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [unlocking, setUnlocking] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const router = useRouter();
    const [active, setActive] = useState(true);
    const [openReplies, setOpenReplies] = useState(false);
    // You May Like (same genre, most viewed, not this book)
    const [books, setBooks] = useState<any[]>([]);
    const [booksLoading, setBooksLoading] = useState(true);
    // The site's light / dark mode, kept up to date when the theme toggle is used
    const [siteDark, setSiteDark] = useState(false);
    const lastSiteDark = useRef<boolean | null>(null);
    // Reading-time rewards: only while an unlocked chapter is on screen
    useRewardTimers(active && !loading && Boolean(data?.chapter) && !data?.chapter?.isLocked);

    // Library: remember the chapter this reader opened (for "Continue reading" and the Viewed / Finished tabs)
    const signedIn = useAuthStore((s) => Boolean(s.user));
    const progressBook = data?.story?.slug as string | undefined;
    const progressChapter = data?.chapter?.chapter_number as number | undefined;
    useEffect(() => {
        if (!signedIn || !progressBook || !progressChapter) return;
        fetch("/api/library/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ id: progressBook, chapter: progressChapter }),
        }).catch(() => { });
    }, [signedIn, progressBook, progressChapter]);

    // Saved choices; a site in dark mode opens the reader on Black even if Light was saved
    useEffect(() => {
        const saved = savedSettings() ?? {};
        const dark = siteIsDark();
        setSettings((s) => {
            const next = { ...s, ...saved };
            if (dark && next.theme === "light") next.theme = SITE_DARK_THEME;
            return next;
        });
    }, []);

    // Watch the site's light / dark toggle
    useEffect(() => {
        const update = () => setSiteDark(siteIsDark());
        update();
        const observer = new MutationObserver(update);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => observer.disconnect();
    }, []);

    // The site switched mode while reading: Light ↔ Black follow it (Sepia and Dark stay as picked)
    useEffect(() => {
        const before = lastSiteDark.current;
        lastSiteDark.current = siteDark;
        if (before === null || before === siteDark) return;
        setSettings((s) => {
            if (siteDark && s.theme === "light") return { ...s, theme: SITE_DARK_THEME };
            if (!siteDark && s.theme === SITE_DARK_THEME) return { ...s, theme: "light" };
            return s;
        });
    }, [siteDark]);

    // Changed in Display Options: show it and keep it for next time
    const updateSettings = (next: ReaderSettings) => {
        setSettings(next);
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
        } catch {
            // private browsing etc.: the choice still applies now
        }
    };

    useEffect(() => {
        const handle = () => {
            setActive(document.visibilityState === "visible");
        };

        document.addEventListener("visibilitychange", handle);
        return () => document.removeEventListener("visibilitychange", handle);
    }, []);

    const fetchChapters = async () => {
        try {
            const res = await fetch(`/api/stories/${slug}/chapters`);
            setChapters(res.ok ? await res.json() : []);
        } catch (err) {
            console.log(err);
            setChapters([]);
        }
    }

    const fetchData = async () => {
        try {
            setLoading(true);

            const res = await fetch(
                `/api/stories/${slug}/chapters/${chapterNumber}`
            );

            setData(res.ok ? await res.json() : null)
        } catch (err) {
            console.log(err);
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!slug) return;
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug, chapterNumber]);

    // The chapter list only changes with the book, not with every chapter
    useEffect(() => {
        if (!slug) return;
        fetchChapters();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug]);

    // You May Like: once per book (not on every chapter change)
    const likeGenre = data?.story?.genreSlug || genre;
    const likeExclude = data?.story?.slug || slug;
    useEffect(() => {
        if (!likeGenre || !likeExclude) return;
        let cancelled = false;
        setBooksLoading(true);
        fetchStories({ genre: String(likeGenre), exclude: String(likeExclude), sort: "views", limit: 14 })
            .then((list) => { if (!cancelled) setBooks(list); })
            .catch((error) => console.log(error))
            .finally(() => { if (!cancelled) setBooksLoading(false); });
        return () => { cancelled = true; };
    }, [likeGenre, likeExclude]);

    // Opened from an old link (renamed book, or the genre changed): switch to the current one, same chapter
    useEffect(() => {
        const story = data?.story;
        if (!story?.slug) return;
        if (story.slug !== slug || (story.genreSlug && story.genreSlug !== genre)) {
            router.replace(`/stories/${story.genreSlug || genre}/${story.slug}/reader?chapter=${chapterNumber}`);
        }
    }, [data, slug, genre, chapterNumber, router]);

    // First load: whole page skeleton. Changing chapter: only the chapter area (below).
    if (loading && !data) {
        return <ReaderSkeleton />;
    }

    if (!data) {
        return <div className="p-10 min-h-screen text-gray-700 dark:text-neutral-300 dark:bg-dark">No data found</div>;
    }

    // Previous / next by the book's real chapter numbers (they can have gaps)
    const numbers: number[] = Array.isArray(chapters)
        ? chapters.map((c: { chapter_number: number }) => Number(c.chapter_number)).filter(Number.isFinite).sort((a, b) => a - b)
        : [];
    const prevChapter = [...numbers].reverse().find((n) => n < chapterNumber) ?? null;
    const nextChapter = numbers.find((n) => n > chapterNumber) ?? null;
    // The book's first chapter (its lowest number; chapter 1 until the list has loaded): only there the cover shows
    const isFirstChapter = chapterNumber === (numbers[0] ?? 1);

    const theme = THEMES[settings.theme] ?? THEMES.light;
    const coverImage: string = data?.story?.image || FALLBACK_COVER;
    // The picked font for the chapter (none = the chapter as the writer formatted it)
    const fontFamily = readerFontFamily(settings.fontFamily);
    // Dark or Black reading theme: the popups go dark too (Light / Sepia: they follow the site)
    const popupsDark = DARK_THEMES.has(settings.theme);

    const handleShare = async () => {
        try {
            const story = data?.story;
            const cleanUrl = `${window.location.origin}/stories/${story?.genreSlug || genre}/${story?.slug || slug}`;

            if (navigator.share) {
                await navigator.share({
                    title: story?.title || "Story",
                    text: `Check out this story: ${story?.title}`,
                    url: cleanUrl,
                });
            } else {
                await navigator.clipboard.writeText(cleanUrl);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
            }
        } catch (err) {
            console.log("Share failed", err);
        }
    };

    // Unlocking with coins comes with the coin system
    const handleUnlock = async () => {
        setUnlocking(false);
    };

    return (
        <>
            <div className="min-h-screen flex flex-col items-center transition-all duration-300 dark:bg-dark">
                {/* READING AREA: the reader's theme only applies in here */}
                <div data-theme={settings.theme} style={{ "--font-size": `${settings.fontSize}px`, } as React.CSSProperties}
                    className={`w-full md:w-[90%] mx-auto px-4 md:px-2 py-8 md:py-10 my-4 md:my-10 rounded-lg transition-all duration-300 ${theme.box}`}>
                    <ReadingSettings
                        onOpenSettings={() => setOpenSettings(true)}
                        onOpenToc={() => setOpenToc(true)}
                        onClickShare={handleShare}
                        onOpenGift={() => setOpenGift(true)}
                        onOpenReplies={() => { setOpenReplies(true) }}
                        bookId={String(slug)}
                        title={data?.story?.title}
                        image={coverImage}
                    />

                    {/* BOOK HEADER (the cover only on the first chapter) */}
                    <div className="flex flex-col items-center text-center mb-6">
                        {isFirstChapter && <Cover src={data?.story?.image} />}
                        <h1 className={`${isFirstChapter ? "mt-4" : ""} text-xl font-bold`}>
                            {data?.story?.title}
                        </h1>

                        <p className={`${theme.muted} text-sm`}>AUTHOR: {data?.story?.author}</p>
                    </div>

                    {/* LINE BREAK */}
                    <div className="flex items-center my-6">
                        <div className={`flex-1 border-t ${theme.line}`} />
                        <div className="px-4">
                            <Image
                                src="/fang_pictures/fang_logo2.png"
                                alt="logo"
                                width={30}
                                height={30}
                                className="opacity-70"
                            />
                        </div>
                        <div className={`flex-1 border-t ${theme.line}`} />
                    </div>

                    {loading ? (
                        <ChapterSkeleton />
                    ) : (
                        // The reader's chosen font applies to the chapter itself (title and text)
                        <div
                            className={fontFamily ? `reader-font ${readerFontClass(settings.fontFamily)}` : undefined}
                            style={fontFamily ? ({ "--reader-font": fontFamily } as React.CSSProperties) : undefined}>
                            {fontFamily && <style>{FORCE_FONT_CSS}</style>}

                            {/* CHAPTER HEADER */}
                            {/* CHAPTER HEADER (the colon only when the chapter has a title) */}
                            <div className="mb-6">
                                <h2 className="text-xl md:text-2xl font-bold">
                                    Chapter {data?.chapter?.chapter_number}
                                    {data?.chapter?.title?.trim() ? `: ${data.chapter.title.trim()}` : ""}
                                </h2>
                            </div>

                            <ChapterContent
                                content={data.chapter.content}
                                locked={data.chapter.isLocked}
                                unlocking={unlocking}
                                onUnlock={handleUnlock}
                            />
                        </div>
                    )}

                    {/* NAVIGATION */}
                    <div className={`flex justify-between mt-10 border-t ${theme.line} pt-6`}>
                        {prevChapter !== null ? (
                            <Button disabled={loading} onClick={() => router.replace(`?chapter=${prevChapter}`)} label="Previous" className="w-full md:w-90 rounded-lg md:rounded-full px-2 md:px-0" />
                        ) : (
                            <div />
                        )}

                        <Button
                            className="w-full md:w-90 rounded-lg md:rounded-full px-4 md:px-0"
                            disabled={loading || data.chapter.isLocked || nextChapter === null}
                            onClick={() => nextChapter !== null && router.replace(`?chapter=${nextChapter}`)}
                            label={data.chapter.isLocked ? "Unlock Chapter First 🔒" : "Next"}
                        />
                    </div>
                </div>

                {/* YOU MAY LIKE (site theme, not the reading theme) */}
                <section className="w-full md:w-[90%] mx-auto px-4 md:px-2 pb-10 md:pb-14 text-gray-800 dark:text-neutral-200">
                    <SectionHeader title="You May Like" href={`/stories/${likeGenre}`} />
                    <BookGrid data={books} loading={booksLoading} />
                </section>
            </div>

            {/* POPUPS: dark with the Dark / Black reading theme, otherwise the site's light / dark mode */}
            <div className={popupsDark ? "dark" : undefined}>
                {openSettings && (
                    <SettingsSheets
                        settings={settings}
                        setSettings={updateSettings}
                        onClose={() => setOpenSettings(false)}
                    />
                )}

                {openToc && (
                    <TocSheet
                        chapters={chapters}
                        currentChapter={chapterNumber}
                        onClose={() => setOpenToc(false)}
                    />
                )}

                {openGift && (
                    <GiftCard
                        title={data?.story?.title}
                        image={coverImage}
                        onClose={() => setOpenGift(false)}
                    />
                )}

                {openReplies && data?.chapter?.id && (
                    <ReplyPanel
                        open={openReplies}
                        onClose={() => setOpenReplies(false)}
                        chapterId={String(data.chapter.id)}
                    />
                )}
            </div>

            {linkCopied && (
                <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-900 dark:bg-dark-raised dark:border dark:border-neutral-700 px-4 py-2 text-sm text-white shadow-lg">
                    Link copied
                </div>
            )}

            <Footer />
        </>
    );
}