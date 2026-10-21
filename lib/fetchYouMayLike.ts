// lib/fetch-you-may-like.ts
// You May Like for a book (see app/api/stories/you-may-like/route.ts).
// language: the language the reader picked on the site (only books in it are shown)
// sort: "hot" (most viewed), "leading" (best rated) or "new" (newest)
// Returns the book cards (with their average rating), or [] if it couldn't load.
export type YouMayLikeSort = "hot" | "leading" | "new";

export async function fetchYouMayLike(book: string, language?: string, sort: YouMayLikeSort = "hot", limit = 9) {
    const params = new URLSearchParams({ book, sort, limit: String(limit) });
    if (language) params.set("language", language);
    const res = await fetch(`/api/stories/you-may-like?${params}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
}