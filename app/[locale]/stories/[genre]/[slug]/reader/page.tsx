"use client";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Footer from "@/components/footer";
import ReadingSettings from "@/components/book-controls/reader-settings";
import SettingsSheets from "@/components/book-controls/settings";
import { Button } from "@/components/Button";
import TocSheet from "@/components/book-controls/table-of-contents";
import { useRewardTimers } from "@/components/profile-components/wallet-cards/reading-time-tracker";
import GiftCard from "@/components/book-controls/gift";
import ReplyPanel from "@/components/book-controls/reply";
import ChapterContent from "@/components/reader/chapter-content";
import { ChapterSkeleton, ReaderSkeleton } from "@/components/skeleton";
import { useAuthStore } from "@/lib/store/authStore";

const FALLBACK_COVER = "/fang_pictures/bookFace.png";

// Reader themes (picked in the reading settings). muted = small grey text, line = dividers.
const THEMES: Record<string, { box: string; muted: string; faint: string; line: string }> = {
    light: { box: "bg-white text-black", muted: "text-gray-500", faint: "text-gray-400", line: "border-gray-300" },
    sepia: { box: "bg-[#f4ecd8] text-black", muted: "text-gray-600", faint: "text-gray-500", line: "border-[#d9ccb0]" },
    dark: { box: "bg-gray-900 text-white", muted: "text-gray-400", faint: "text-gray-500", line: "border-gray-700" },
    black: { box: "bg-black text-white", muted: "text-gray-400", faint: "text-gray-500", line: "border-gray-800" },
};

// Is the site in dark mode? (a "dark"/"light" class on <html>, otherwise the device setting)
function siteIsDark() {
    if (typeof window === "undefined") return false;
    const html = document.documentElement.classList;
    if (html.contains("dark")) return true;
    if (html.contains("light")) return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
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
    const [settings, setSettings] = useState({ fontSize: 18, theme: "light", });
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

    // Site in dark mode: open the reader on the dark theme (light can still be picked in settings)
    useEffect(() => {
        if (siteIsDark()) setSettings((s) => (s.theme === "light" ? { ...s, theme: "dark" } : s));
    }, []);

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

    const theme = THEMES[settings.theme] ?? THEMES.light;
    const coverImage: string = data?.story?.image || FALLBACK_COVER;

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
            <div className="min-h-screen flex justify-center transition-all duration-300 dark:bg-dark"
                data-theme={settings.theme} style={{ "--font-size": `${settings.fontSize}px`, } as React.CSSProperties}>
                <div className={`w-full md:w-[90%] mx-auto px-2 py-10 my-10 rounded-lg transition-all duration-300 ${theme.box}`}>
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

                    {/* BOOK HEADER */}
                    <div className="flex flex-col items-center text-center mb-6">
                        <Cover src={data?.story?.image} />
                        <h1 className="mt-4 text-xl font-bold">
                            {data?.story?.title}
                        </h1>

                        <p className={`${theme.muted} text-sm`}>AUTHOR: {data?.story?.author}</p>
                    </div>

                    {/* SETTINGS */}
                    {openSettings && (
                        <SettingsSheets
                            settings={settings}
                            setSettings={setSettings}
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

                    {openReplies && (
                        <ReplyPanel
                            open={openReplies}
                            onClose={() => setOpenReplies(false)}
                            chapterId={data.chapter.chapter_number}
                        />
                    )}

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
                        <>
                            {/* CHAPTER HEADER */}
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold">
                                    Chapter {data?.chapter?.chapter_number}: {data?.chapter?.title}
                                </h2>
                            </div>

                            <ChapterContent
                                content={data.chapter.content}
                                locked={data.chapter.isLocked}
                                unlocking={unlocking}
                                onUnlock={handleUnlock}
                            />
                        </>
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