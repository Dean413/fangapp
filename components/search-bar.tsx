"use client";

// The navbar's search. Tapping it opens a full search screen on top of the page:
//  - before typing: the reader's recent searches (kept in this browser) and Popular now (the most viewed books)
//  - while typing (2+ letters): matching books by title, author or tag, in the language picked on the site
//  - Enter or "See all results" opens the search page; Esc, ✕ or the browser's Back button closes the screen
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Clock, Loader2, Search, X } from "lucide-react";
import { useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { languageForLocale } from "@/lib/language";

type SearchBarProps = {
    value?: string;                       // kept for the navbar; the search screen keeps its own text
    onChange?: (value: string) => void;
    placeholder?: string;
    variant?: "bar" | "icon";             // "icon": just a round search button (the phone navbar)
};

type Book = {
    id: string;
    slug: string;
    title: string;
    author: string;
    genre: string;
    genreSlug: string;
    image: string;
    views?: string;
};

const MIN_CHARS = 2;
const RESULTS = 12;
const POPULAR = 8;
const WAIT_MS = 250;           // a short pause after typing before searching
const RECENT_KEY = "fang-recent-searches";
const MAX_RECENT = 8;

export const SEARCH_PATH = "/search";
const bookHref = (b: Book) => `/stories/${b.genreSlug || "all"}/${b.slug}`;

// Recent searches live in this browser only (nothing is sent anywhere)
function readRecent(): string[] {
    try {
        const list = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
        return Array.isArray(list) ? list.filter((x) => typeof x === "string").slice(0, MAX_RECENT) : [];
    } catch {
        return [];
    }
}
function writeRecent(list: string[]) {
    try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
    } catch {
        // private browsing etc.
    }
}

// onClose: closed by the reader (✕, Esc); onLeave: going to another page (the screen just disappears)
function SearchScreen({ onClose, onLeave }: { onClose: () => void; onLeave: () => void }) {
    const router = useRouter();
    const language = languageForLocale(useLocale());
    const input = useRef<HTMLInputElement>(null);
    const [text, setText] = useState("");
    const [results, setResults] = useState<Book[]>([]);
    const [searching, setSearching] = useState(false);
    const [failed, setFailed] = useState(false);
    const [recent, setRecent] = useState<string[]>([]);
    const [popular, setPopular] = useState<Book[]>([]);
    const [popularLoading, setPopularLoading] = useState(true);
    const [active, setActive] = useState(-1);
    const latest = useRef("");
    const q = text.trim().replace(/\s+/g, " ");

    useEffect(() => {
        input.current?.focus();
        setRecent(readRecent());
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = "auto"; };
    }, []);

    // Popular now: the most viewed books in this language
    useEffect(() => {
        let cancelled = false;
        setPopularLoading(true);
        const params = new URLSearchParams({ sort: "views", limit: String(POPULAR), language });
        fetch(`/api/stories?${params}`)
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => { if (!cancelled) setPopular(Array.isArray(data) ? data : []); })
            .catch(() => { })
            .finally(() => { if (!cancelled) setPopularLoading(false); });
        return () => { cancelled = true; };
    }, [language]);

    // Results after a short pause; answers for older words are ignored
    useEffect(() => {
        setActive(-1);
        setFailed(false);
        if (q.length < MIN_CHARS) {
            setResults([]);
            setSearching(false);
            return;
        }
        const key = `${language}|${q}`;
        latest.current = key;
        setSearching(true);
        const timer = setTimeout(async () => {
            try {
                const params = new URLSearchParams({ q, language, limit: String(RESULTS) });
                const res = await fetch(`/api/search?${params}`, { cache: "no-store" });
                const data = await res.json().catch(() => ({}));
                if (latest.current !== key) return;
                if (!res.ok) setFailed(true);
                setResults(Array.isArray(data.books) ? data.books : []);
            } catch {
                if (latest.current === key) { setResults([]); setFailed(true); }
            } finally {
                if (latest.current === key) setSearching(false);
            }
        }, WAIT_MS);
        return () => clearTimeout(timer);
    }, [q, language]);

    const remember = (words: string) => {
        const w = words.trim().replace(/\s+/g, " ").slice(0, 80);
        if (w.length < MIN_CHARS) return;
        const next = [w, ...readRecent().filter((r) => r.toLowerCase() !== w.toLowerCase())].slice(0, MAX_RECENT);
        writeRecent(next);
        setRecent(next);
    };

    const removeRecent = (words: string) => {
        const next = recent.filter((r) => r !== words);
        writeRecent(next);
        setRecent(next);
    };

    const clearRecent = () => {
        writeRecent([]);
        setRecent([]);
    };

    const openBook = (b: Book) => {
        if (q.length >= MIN_CHARS) remember(q);
        onLeave();
        // Replaces the step the screen added, so Back returns to the page the reader was on
        router.replace(bookHref(b));
    };

    const seeAll = () => {
        if (q.length < MIN_CHARS) return;
        remember(q);
        onLeave();
        router.replace(`${SEARCH_PATH}?q=${encodeURIComponent(q)}`);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
        if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(results.length - 1, i + 1)); return; }
        if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(-1, i - 1)); return; }
        if (e.key === "Enter") {
            e.preventDefault();
            if (active >= 0 && results[active]) openBook(results[active]);
            else seeAll();
        }
    };

    const typing = q.length >= MIN_CHARS;

    return (
        <div role="dialog" aria-modal="true" aria-label="Search"
            className="fixed inset-0 z-1000 flex flex-col bg-white text-gray-900 dark:bg-dark dark:text-white">
            {/* Search box */}
            <div className="border-b border-gray-100 dark:border-dark-border">
                <div className="mx-auto flex w-[92%] max-w-3xl items-center gap-2 py-3 md:py-4">
                    <button type="button" onClick={onClose} aria-label="Close search"
                        className="rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-dark-raised">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500" />
                        <input
                            ref={input}
                            type="search"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={onKeyDown}
                            placeholder="Search by title, author or tag"
                            aria-label="Search books"
                            autoComplete="off"
                            enterKeyHint="search"
                            maxLength={80}
                            className="h-11 w-full rounded-full border border-gray-200 bg-gray-100 pl-11 pr-11 text-[15px] text-gray-900 outline-none transition placeholder:text-gray-400 focus:ring-2 focus:ring-red-700 dark:border-transparent dark:bg-dark-raised dark:text-white dark:placeholder:text-neutral-500 [&::-webkit-search-cancel-button]:hidden"
                        />
                        {searching ? (
                            <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
                        ) : text && (
                            <button type="button" onClick={() => { setText(""); input.current?.focus(); }} aria-label="Clear"
                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
                <div className="mx-auto w-[92%] max-w-3xl py-5 md:py-6">
                    {typing ? (
                        // Results
                        searching && results.length === 0 ? (
                            <div className="space-y-2">
                                {Array.from({ length: 5 }, (_, i) => (
                                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-dark-raised" />
                                            <div className="h-3 w-1/3 rounded bg-gray-200 dark:bg-dark-raised" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : failed ? (
                            <p className="py-12 text-center text-sm text-gray-500 dark:text-neutral-400">Couldn&apos;t search right now. Please try again.</p>
                        ) : results.length === 0 ? (
                            <p className="py-12 text-center text-sm text-gray-500 dark:text-neutral-400">
                                No books found for &ldquo;{q}&rdquo;. Try a different title, author or tag.
                            </p>
                        ) : (
                            <>
                                <ul className="space-y-1">
                                    {results.map((b, i) => (
                                        <li key={b.id}>
                                            <Link
                                                href={bookHref(b)}
                                                onClick={(e) => { e.preventDefault(); openBook(b); }}
                                                onMouseEnter={() => setActive(i)}
                                                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${i === active ? "bg-gray-100 dark:bg-dark-raised" : "hover:bg-gray-50 dark:hover:bg-dark-card"}`}>
                                                <Search size={15} className="shrink-0 text-gray-400 dark:text-neutral-500" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm md:text-base font-semibold">{b.title}</p>
                                                    <p className="truncate text-xs md:text-sm text-gray-500 dark:text-neutral-400">by {b.author}</p>
                                                </div>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                                <button type="button" onClick={seeAll}
                                    className="mt-4 w-full rounded-full border border-gray-200 py-2.5 text-sm font-medium text-red-600 hover:bg-gray-50 dark:border-dark-border dark:text-red-400 dark:hover:bg-dark-card">
                                    See all results
                                </button>
                            </>
                        )
                    ) : (
                        <>
                            {/* Recent searches */}
                            {recent.length > 0 && (
                                <section className="mb-8">
                                    <div className="mb-3 flex items-center justify-between">
                                        <h2 className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Recent searches</h2>
                                        <button type="button" onClick={clearRecent} className="text-xs font-medium text-red-600 hover:underline dark:text-red-400">
                                            Clear
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {recent.map((r) => (
                                            <span key={r} className="inline-flex items-center gap-1 rounded-full bg-gray-100 pl-3 pr-1 py-1 text-sm text-gray-800 dark:bg-dark-raised dark:text-neutral-200">
                                                <button type="button" onClick={() => { setText(r); input.current?.focus(); }} className="inline-flex items-center gap-1.5">
                                                    <Clock size={13} className="text-gray-400" /> {r}
                                                </button>
                                                <button type="button" onClick={() => removeRecent(r)} aria-label={`Remove ${r}`}
                                                    className="rounded-full p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white">
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Popular now */}
                            <section>
                                <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-neutral-300">Popular now</h2>
                                <ul className="space-y-1">
                                    {popularLoading
                                        ? Array.from({ length: POPULAR }, (_, i) => (
                                            <li key={i} className="px-3 py-2.5 space-y-2 animate-pulse">
                                                <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-dark-raised" />
                                                <div className="h-3 w-1/3 rounded bg-gray-200 dark:bg-dark-raised" />
                                            </li>
                                        ))
                                        : popular.map((b, i) => (
                                            <li key={b.id}>
                                                <Link href={bookHref(b)} onClick={(e) => { e.preventDefault(); openBook(b); }}
                                                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-gray-50 dark:hover:bg-dark-card">
                                                    <span className={`w-5 shrink-0 text-center text-sm font-bold ${i < 3 ? "text-red-600" : "text-gray-400 dark:text-neutral-500"}`}>{i + 1}</span>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm md:text-base font-semibold">{b.title}</p>
                                                        <p className="truncate text-xs md:text-sm text-gray-500 dark:text-neutral-400">by {b.author}</p>
                                                    </div>
                                                </Link>
                                            </li>
                                        ))}
                                </ul>
                            </section>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function SearchBar({ placeholder = "Search for any books", variant = "bar" }: SearchBarProps) {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // The browser's Back button closes the screen (opening adds a step to the history)
    useEffect(() => {
        if (!open) return;
        window.history.pushState({ fangSearch: true }, "");
        const onPop = () => setOpen(false);
        window.addEventListener("popstate", onPop);
        return () => window.removeEventListener("popstate", onPop);
    }, [open]);

    // Closed with ✕ / Esc / a result: take back the history step we added
    const close = () => {
        if (window.history.state?.fangSearch) window.history.back();
        else setOpen(false);
    };

    return (
        <>
            {variant === "icon" ? (
                <button type="button" onClick={() => setOpen(true)} aria-label="Search books"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-700 transition hover:bg-gray-100 dark:border-dark-border dark:text-neutral-200 dark:hover:bg-dark-raised">
                    <Search size={17} />
                </button>
            ) : (
                <button type="button" onClick={() => setOpen(true)} aria-label="Search books"
                    className="relative flex h-10 w-full min-w-56 lg:min-w-72 items-center rounded-full border border-gray-200 bg-gray-100 pl-11 pr-4 text-left text-sm text-gray-400 transition hover:border-gray-300 dark:border-transparent dark:bg-neutral-200 dark:text-neutral-500">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-600" />
                    <span className="truncate">{placeholder}</span>
                </button>
            )}
            {open && mounted && createPortal(<SearchScreen onClose={close} onLeave={() => setOpen(false)} />, document.body)}
        </>
    );
}