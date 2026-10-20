// lib/fetch-you-may-like.ts
// You May Like for a book (see app/api/stories/you-may-like/route.ts): the same writer's books first, then the same genre.
// Returns the same book cards as fetchStories, or [] if it couldn't load.
// language: the language the reader picked on the site (only books in it are shown)
export async function fetchYouMayLike(book: string, language?: string, limit = 14) {
    const params = new URLSearchParams({ book, limit: String(limit) });
    if (language) params.set("language", language);
    const res = await fetch(`/api/stories/you-may-like?${params}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
}