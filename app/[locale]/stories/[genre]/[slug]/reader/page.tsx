"use client";
import Image from "next/image";
import Link from "next/link";
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
import ReportBookDialog from "@/components/book-controls/report-book";
import ReviewPrompt from "@/components/reviews/reviewPrompt";
import { ChapterSkeleton, ReaderSkeleton } from "@/components/skeleton";
import { useAuthStore } from "@/lib/store/authStore";
import { useAuthModals } from "@/lib/store/auth-card-store";
import { useLocale, useTranslations } from "next-intl";
import { fetchYouMayLike } from "@/lib/fetchYouMayLike";
import { languageForLocale } from "@/lib/language";
import { BookGrid, SectionHeader } from "@/hooks/bookData";
import { toast } from "@/lib/store/toastStore";

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
    black: { box: "bg-[#0A0A0A] text-white", muted: "text-gray-400", faint: "text-gray-500", line: "border-gray-800" },
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
    const t = useTranslations("Reader");
    const c = useTranslations("Common");
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
    const [openReport, setOpenReport] = useState(false);
    // The chapter text, for the review popup (halfway / end of the chapter)
    const chapterRef = useRef<HTMLDivElement>(null);
    // You May Like: the same writer's other books first, then the same genre, in the reader's language
    const language = languageForLocale(useLocale());
    const [books, setBooks] = useState<any[]>([]);
    const [booksLoading, setBooksLoading] = useState(true);
    // The site's light / dark mode, kept up to date when the theme toggle is used
    const [siteDark, setSiteDark] = useState(false);
    const lastSiteDark = useRef<boolean | null>(null);
    // Reading-time rewards: only while an unlocked chapter is on screen
    useRewardTimers(active && !loading && Boolean(data?.chapter) && !data?.chapter?.isLocked);

    // Library: remember the chapter this reader opened (for "Continue reading" and the Viewed / Finished tabs)
    const signedIn = useAuthStore((s) => Boolean(s.user));
    const wallet = useAuthStore((s) => s.user?.wallet ?? null);
    const openSignIn = useAuthModals((s) => s.openSignIn);
    // Unlocking with coins: blocks double taps; auto-unlock is tried once per chapter
    const unlockBusy = useRef(false);
    const [autoBusy, setAutoBusy] = useState(false);
    const autoTried = useRef<string | null>(null);
    const progressBook = data?.story?.slug as string | undefined;
    const progressChapter = data?.chapter?.chapter_number as number | undefined;
    // Sent again once a paid chapter is unlocked, so it counts as read
    const progressLocked = Boolean(data?.chapter?.isLocked);
    useEffect(() => {
        if (!signedIn || !progressBook || !progressChapter) return;
        fetch("/api/library/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ id: progressBook, chapter: progressChapter }),
        }).catch(() => { });
    }, [signedIn, progressBook, progressChapter, progressLocked]);

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
            const res = await fetch(`/api/stories/${slug}/chapters`, { credentials: "include", cache: "no-store" });
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
                `/api/stories/${slug}/chapters/${chapterNumber}`,
                { credentials: "include", cache: "no-store" }
            );

            setData(res.ok ? await res.json() : null)
        } catch (err) {
            console.log(err);
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    // Reloads when the reader signs in or out too (which chapters are unlocked depends on the account)
    useEffect(() => {
        if (!slug) return;
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug, chapterNumber, signedIn]);

    // The chapter list only changes with the book (and the account), not with every chapter
    useEffect(() => {
        if (!slug) return;
        fetchChapters();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug, signedIn]);

    // Unlock the open chapter with coins (bonus coins first). Shows the full chapter straight away.
    const unlockNow = async (auto = false) => {
        if (unlockBusy.current) return;
        const book = data?.story?.slug;
        const number = data?.chapter?.chapter_number;
        if (!book || !number) return;
        if (!signedIn) return openSignIn();
        unlockBusy.current = true;
        setUnlocking(true);
        try {
            const res = await fetch("/api/unlocks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ book, chapter: number }),
            });
            const body = await res.json().catch(() => ({}));
            const user = useAuthStore.getState().user;
            if (body.wallet && user) useAuthStore.getState().setUser({ ...user, wallet: body.wallet });
            if (!res.ok) {
                if (res.status === 401) openSignIn();
                else if (res.status === 409 && body.firstLocked) {
                    toast(body.message);
                    router.replace(`?chapter=${body.firstLocked}`);
                }
                else if (!auto || res.status !== 402) toast.error(body.message || t("couldntUnlock"));
                return;
            }
            if (body.chapter) {
                setData((d: any) => (d ? { ...d, chapter: body.chapter } : d));
                setChapters((list: any) => Array.isArray(list)
                    ? list.map((c: any) => (c.chapter_number === number ? { ...c, isLocked: false } : c))
                    : list);
            }
            if (body.charged > 0) toast.success(body.message || t("unlocked"));
        } catch {
            toast.error(c("networkError"));
        } finally {
            unlockBusy.current = false;
            setUnlocking(false);
        }
    };

    // "Auto-Unlock Next Chapter" for this book
    const toggleAuto = async () => {
        const book = data?.story?.slug;
        if (!book || autoBusy) return;
        if (!signedIn) return openSignIn();
        const enabled = !data?.chapter?.autoUnlock;
        setAutoBusy(true);
        setData((d: any) => (d?.chapter ? { ...d, chapter: { ...d.chapter, autoUnlock: enabled } } : d));
        try {
            const res = await fetch("/api/unlocks/auto", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ book, enabled }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                setData((d: any) => (d?.chapter ? { ...d, chapter: { ...d.chapter, autoUnlock: !enabled } } : d));
                toast.error(body.message || t("couldntChangeAuto"));
            }
        } catch {
            setData((d: any) => (d?.chapter ? { ...d, chapter: { ...d.chapter, autoUnlock: !enabled } } : d));
            toast.error(c("networkError"));
        } finally {
            setAutoBusy(false);
        }
    };

    // Auto-unlock on: a locked chapter unlocks by itself when opened, if the reader has enough coins (once per chapter)
    const lockedChapter = !loading && data?.chapter?.isLocked ? data.chapter : null;
    const balance = (wallet?.coins ?? 0) + (wallet?.bonusCoins ?? 0);
    useEffect(() => {
        if (!lockedChapter || !lockedChapter.autoUnlock || !signedIn || lockedChapter.firstLocked) return;
        if (autoTried.current === String(lockedChapter.id)) return;
        if (balance < Number(lockedChapter.price || 0)) return;
        autoTried.current = String(lockedChapter.id);
        unlockNow(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lockedChapter?.id, lockedChapter?.autoUnlock, signedIn, balance]);

    // You May Like: once per book (not on every chapter change), and again when the language changes
    const likeGenre = data?.story?.genreSlug || genre;
    const likeBook = data?.story?.slug || slug;
    useEffect(() => {
        if (!likeBook) return;
        let cancelled = false;
        setBooksLoading(true);
        fetchYouMayLike(String(likeBook), language)
            .then((list) => { if (!cancelled) setBooks(list); })
            .catch((error) => console.log(error))
            .finally(() => { if (!cancelled) setBooksLoading(false); });
        return () => { cancelled = true; };
    }, [likeBook, language]);

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
        return <div className="p-10 min-h-screen text-gray-700 dark:text-neutral-300 dark:bg-dark">{t("noData")}</div>;
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
                    title: story?.title || t("story"),
                    text: t("shareText", { title: story?.title ?? "" }),
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

    return (
        <>
            <div className="min-h-screen flex flex-col items-center transition-all duration-300 dark:bg-dark">
                {/* BREADCRUMB: Home / Genre / Book / Chapter */}
                <nav aria-label={t("breadcrumb")} className="w-full md:w-[90%] mx-auto px-4 md:px-2 pt-6 md:pt-8 text-sm md:text-base">
                    <ol className="flex items-center gap-2 md:gap-3 min-w-0 text-gray-500 dark:text-neutral-400">
                        <li className="shrink-0">
                            <Link href="/" className="hover:text-gray-900 dark:hover:text-white transition">{t("home")}</Link>
                        </li>
                        <li aria-hidden="true" className="shrink-0">/</li>
                        <li className="shrink-0 max-w-[25%] truncate">
                            <Link href={`/stories/${data?.story?.genreSlug || genre}`} className="hover:text-gray-900 dark:hover:text-white transition">
                                {data?.story?.genre || t("stories")}
                            </Link>
                        </li>
                        <li aria-hidden="true" className="shrink-0">/</li>
                        <li className="min-w-0 truncate">
                            <Link href={`/stories/${data?.story?.genreSlug || genre}/${data?.story?.slug || slug}`} className="hover:text-gray-900 dark:hover:text-white transition">
                                {data?.story?.title}
                            </Link>
                        </li>
                        <li aria-hidden="true" className="shrink-0">/</li>
                        <li aria-current="page" className="min-w-0 truncate font-semibold text-gray-900 dark:text-white">
                            {t("chapterN", { chapter: data?.chapter?.chapter_number ?? chapterNumber })}
                            {data?.chapter?.title?.trim() ? `: ${data.chapter.title.trim()}` : ""}
                        </li>
                    </ol>
                </nav>

                {/* READING AREA: the reader's theme only applies in here */}
                <div data-theme={settings.theme} style={{ "--font-size": `${settings.fontSize}px`, } as React.CSSProperties}
                    className={`w-full md:w-[90%] mx-auto px-4 md:px-2 py-8 md:py-10 my-4 md:my-10 rounded-lg transition-all duration-300 ${theme.box}`}>
                    <ReadingSettings
                        onOpenSettings={() => setOpenSettings(true)}
                        onOpenToc={() => setOpenToc(true)}
                        onClickShare={handleShare}
                        onOpenGift={() => setOpenGift(true)}
                        onOpenReplies={() => { setOpenReplies(true) }}
                        onOpenReport={() => setOpenReport(true)}
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

                        {data?.story?.author && (
                            <p className={`${theme.muted} text-sm`}>{t("author", { author: data.story.author })}</p>
                        )}
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

                            {/* CHAPTER HEADER (the colon only when the chapter has a title) */}
                            <div className="mb-6">
                                <h2 className="text-xl md:text-2xl font-bold">
                                    Chapter {data?.chapter?.chapter_number}
                                    {data?.chapter?.title?.trim() ? `: ${data.chapter.title.trim()}` : ""}
                                </h2>
                            </div>

                            <div ref={chapterRef}>
                                <ChapterContent
                                    content={data.chapter.content}
                                    locked={data.chapter.isLocked}

                                    unlock={{
                                        price: Number(data.chapter.price) || 0,
                                        signedIn,
                                        wallet,
                                        unlocking,
                                        onUnlock: () => unlockNow(false),
                                        onSignIn: openSignIn,
                                        autoUnlock: Boolean(data.chapter.autoUnlock),
                                        autoBusy,
                                        onToggleAuto: toggleAuto,
                                        dark: popupsDark,
                                        firstLocked: data.chapter.firstLocked ?? null,
                                        onGoToFirst: () => data.chapter.firstLocked && router.replace(`?chapter=${data.chapter.firstLocked}`),
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* NAVIGATION */}
                    <div className={`flex justify-between mt-10 border-t ${theme.line} pt-6`}>
                        {prevChapter !== null ? (
                            <Button disabled={loading} onClick={() => router.replace(`?chapter=${prevChapter}`)} label={t("previous")} className="w-full md:w-90 rounded-lg md:rounded-full px-2 md:px-0" />
                        ) : (
                            <div />
                        )}

                        <Button
                            className="w-full md:w-90 rounded-lg md:rounded-full px-4 md:px-0"
                            disabled={loading || data.chapter.isLocked || nextChapter === null}
                            onClick={() => nextChapter !== null && router.replace(`?chapter=${nextChapter}`)}
                            label={data.chapter.isLocked ? t("unlockFirst") : t("next")}
                        />
                    </div>
                </div>

                {/* YOU MAY LIKE (site theme, not the reading theme) */}
                <section className="w-full md:w-[90%] mx-auto px-4 md:px-2 pb-10 md:pb-14 text-gray-800 dark:text-neutral-200">
                    <SectionHeader title={t("youMayLike")} href={`/stories/${likeGenre}`} />
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

                <ReportBookDialog
                    open={openReport}
                    onClose={() => setOpenReport(false)}
                    book={{
                        slug: data?.story?.slug || String(slug),
                        title: data?.story?.title,
                        author: data?.story?.author,
                        image: data?.story?.image,
                    }}
                />

                <ReviewPrompt
                    book={data?.story?.slug || String(slug)}
                    chapter={Number(data?.chapter?.chapter_number) || chapterNumber}
                    enabled={signedIn && !loading && Boolean(data?.chapter) && !data?.chapter?.isLocked}
                    contentRef={chapterRef}
                />
            </div>

            {linkCopied && (
                <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-900 dark:bg-dark-raised dark:border dark:border-neutral-700 px-4 py-2 text-sm text-white shadow-lg">
                    {t("linkCopied")}
                </div>
            )}

            <Footer />
        </>
    );
}