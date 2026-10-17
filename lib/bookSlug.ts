// app/lib/bookSlug.ts
// Finds a book from the last part of its link (/stories/<genre>/<slug>).
// A book that was renamed is also found by its old slugs; `moved` tells the page to redirect to the current link.
// Server only.
import { db } from "./db";

export type BookKind = "story" | "comic";

export type SlugMatch = {
    id: string;
    slug: string; // the book's current slug
    genre: string | null;
    moved: boolean; // true when found by an old slug
};

const TABLE: Record<BookKind, string> = { story: "stories", comic: "comics" };

export async function findBookBySlug(kind: BookKind, slug: string): Promise<SlugMatch | null> {
    const table = TABLE[kind];
    const clean = (slug ?? "").trim().toLowerCase().slice(0, 300);
    if (!clean) return null;

    const { rows } = await db.query(
        `SELECT id, slug, genre FROM ${table} WHERE slug = $1 AND COALESCE(is_deleted, false) = false`,
        [clean]
    );
    if (rows[0]) return { id: rows[0].id, slug: rows[0].slug, genre: rows[0].genre, moved: false };

    // An old link of a renamed book
    const { rows: old } = await db.query(
        `SELECT b.id, b.slug, b.genre
         FROM book_slug_history h
         JOIN ${table} b ON b.id = h.book_id
         WHERE h.kind = $1 AND h.slug = $2 AND COALESCE(b.is_deleted, false) = false`,
        [kind, clean]
    );
    return old[0] ? { id: old[0].id, slug: old[0].slug, genre: old[0].genre, moved: true } : null;
}

// For the old /book/<id> links: the book's current slug and genre
export async function findBookById(id: string): Promise<(SlugMatch & { kind: BookKind }) | null> {
    if (!/^[0-9a-f-]{36}$/i.test(id ?? "")) return null;
    const { rows } = await db.query(
        `SELECT id, slug, genre, 'story' AS kind FROM stories WHERE id = $1 AND COALESCE(is_deleted, false) = false
         UNION ALL
         SELECT id, slug, genre, 'comic' AS kind FROM comics WHERE id = $1 AND COALESCE(is_deleted, false) = false
         LIMIT 1`,
        [id]
    );
    const r = rows[0];
    return r ? { id: r.id, slug: r.slug, genre: r.genre, kind: r.kind, moved: true } : null;
}