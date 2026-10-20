// app/lib/home.ts
// The Home rows the admin set up in Multi-Tenant Curation (Editor's Picks, Top Trending, Fang Originals, ...).
// Server only: call it from a Server Component.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "./db";

export type HomeBook = {
    id: string;
    slug: string; // the book's link name, e.g. "plus-size-mate-for-my-brother-s-three-best-friends-by-faithuba"
    kind: "story" | "comic";
    title: string;
    image: string | null;
    author: string;
    genre: string | null;
    tags: string[];
    blurb: string | null;
    views: number; // already has the 3,000 threshold taken off
    completed: boolean;
    exclusive: boolean; // under a signed Exclusive or MAB-Exclusive contract
    rating: number | null; // average of the readers' reviews (0.5 to 5), null = no reviews yet
};

export type HomeCollection = {
    id: string;
    name: string;
    description: string;
    books: HomeBook[];
};

type HomeQuery = {
    tenant: string; // "fang", "fangnova", "fangverse" or "fangink"
    language?: string;
    platform?: "Websites" | "Apps";
};

const list = (v: unknown) => (Array.isArray(v) ? (v as string[]).filter(Boolean) : []);

// Pen name, else full name (some profiles have '' saved as the pen name)
const AUTHOR = `
    LEFT JOIN LATERAL (
        SELECT COALESCE(NULLIF(trim(pen_name), ''), NULLIF(trim(full_name), ''), 'Unknown') AS name
        FROM user_profiles WHERE user_id = b.user_id ORDER BY created_at DESC LIMIT 1
    ) p ON true`;

// Average review rating (stories only; hidden reviews don't count)
const RATING = `
    LEFT JOIN LATERAL (
        SELECT round(avg(r.rating), 1) AS rating FROM book_reviews r WHERE r.story_id = b.id AND NOT r.hidden
    ) rv ON true`;

// The contract the book is under: the newest signed one
const SIGNED_PLAN = (column: "story_id" | "comic_id") => `
    LEFT JOIN LATERAL (
        SELECT plan_id::text AS plan FROM contracts
        WHERE ${column} = b.id AND status = 'signed'
        ORDER BY created_at DESC LIMIT 1
    ) ct ON true`;

// FangInk lists hold comics; the other reader apps hold stories.
// collection_id is compared as a number (not cast to text) so Postgres can use its index.
const STORY_ITEMS = `
    SELECT i.collection_id::text AS collection_id, b.id, b.slug, b.title, b.image, b.genre, b.tags, b.blurb, b.views,
           b.story_status AS progress, p.name AS author, ct.plan, rv.rating
    FROM curation_items i
    JOIN stories b ON b.id = i.story_id
    ${AUTHOR}
    ${SIGNED_PLAN("story_id")}
    ${RATING}
    WHERE i.collection_id = ANY($1::bigint[])
      AND COALESCE(b.is_deleted, false) = false
      AND $2 = ANY(b.tenants)
      AND EXISTS (SELECT 1 FROM chapters c WHERE c.story_id = b.id AND c.status = 'published')
    ORDER BY i.position, i.created_at`;

const COMIC_ITEMS = `
    SELECT i.collection_id::text AS collection_id, b.id, b.slug, b.title, b.cover_image AS image, b.genre, b.tags,
           b.description AS blurb, b.views, b.status AS progress, p.name AS author, ct.plan, NULL::numeric AS rating
    FROM curation_items i
    JOIN comics b ON b.id = i.comic_id
    ${AUTHOR}
    ${SIGNED_PLAN("comic_id")}
    WHERE i.collection_id = ANY($1::bigint[])
      AND COALESCE(b.is_deleted, false) = false
      AND $2 = ANY(b.tenants)
      AND EXISTS (SELECT 1 FROM comic_episodes e WHERE e.comic_id = b.id AND e.status = 'published')
    ORDER BY i.position, i.created_at`;

function toBook(r: any, comics: boolean): HomeBook {
    return {
        id: r.id,
        slug: r.slug ?? r.id,
        kind: comics ? "comic" : "story",
        title: r.title || "Untitled",
        image: r.image,
        author: r.author ?? "Unknown",
        genre: r.genre,
        tags: list(r.tags),
        blurb: r.blurb,
        views: Number(r.views ?? 0),
        completed: r.progress === "completed",
        exclusive: r.plan === "exclusive" || r.plan === "mab-exclusive",
        rating: r.rating != null ? Number(r.rating) : null,
    };
}

// Enabled Home collections in the admin's order, each with its books in the admin's order.
// A book is skipped if it was deleted, taken off this app, or has nothing published yet.
export async function getHomeCollections({ tenant, language = "English", platform = "Websites" }: HomeQuery): Promise<HomeCollection[]> {
    const { rows: collections } = await db.query(
        `SELECT id::text AS id, name, description
         FROM curation_collections
         WHERE section = 'home' AND enabled AND tenant = $1 AND language = $2 AND platform = $3
         ORDER BY display_order, created_at`,
        [tenant, language, platform]
    );
    if (collections.length === 0) return [];

    const comics = tenant === "fangink";
    const { rows: items } = await db.query(comics ? COMIC_ITEMS : STORY_ITEMS, [collections.map((c) => c.id), tenant]);

    return collections
        .map((c) => ({
            id: c.id as string,
            name: c.name as string,
            description: (c.description ?? "") as string,
            books: items.filter((r) => r.collection_id === c.id).map((r) => toBook(r, comics)),
        }))
        .filter((c) => c.books.length > 0); // hide empty rows
}

// One Home collection with all its books, for its "View All" page. null = not found, disabled or empty.
export async function getHomeCollection(id: string): Promise<HomeCollection | null> {
    if (!/^\d{1,18}$/.test(id)) return null;
    const { rows } = await db.query(
        `SELECT id::text AS id, name, description, tenant
         FROM curation_collections
         WHERE id = $1::bigint AND section = 'home' AND enabled`,
        [id]
    );
    const c = rows[0];
    if (!c) return null;

    const comics = c.tenant === "fangink";
    const { rows: items } = await db.query(comics ? COMIC_ITEMS : STORY_ITEMS, [[c.id], c.tenant]);
    const books = items.map((r) => toBook(r, comics));
    if (books.length === 0) return null;
    return { id: c.id, name: c.name, description: c.description ?? "", books };
}

// Recommended for a signed-in reader: books from their favorite genres (primary or secondary genre) in this app's
// language, the most viewed first, leaving out books they've already opened. [] when they picked no genres.
// Stories only (FangInk's comics have no favorite genres).
export async function getRecommended(userId: string, { tenant, language = "English" }: HomeQuery, limit = 18): Promise<HomeBook[]> {
    if (tenant === "fangink") return [];
    const { rows } = await db.query(
        `WITH fav AS (
             SELECT fang_slugify(o.name) AS slug
             FROM reader_favorite_genres g JOIN metadata_options o ON o.id = g.option_id
             WHERE g.user_id = $1
         )
         SELECT b.id, b.slug, b.title, b.image, b.genre, b.tags, b.blurb, b.views,
                b.story_status AS progress, p.name AS author, ct.plan, rv.rating
         FROM stories b
         ${AUTHOR}
         ${SIGNED_PLAN("story_id")}
         ${RATING}
         WHERE COALESCE(b.is_deleted, false) = false
           AND $2 = ANY(b.tenants)
           AND b.language = $3
           AND (fang_slugify(b.genre) IN (SELECT slug FROM fav) OR COALESCE(fang_slugify(b.secondary_genre) IN (SELECT slug FROM fav), false))
           AND b.user_id IS DISTINCT FROM $1
           AND NOT EXISTS (SELECT 1 FROM reading_progress rp WHERE rp.user_id = $1 AND rp.story_id = b.id)
           AND EXISTS (SELECT 1 FROM chapters c WHERE c.story_id = b.id AND c.status = 'published')
         ORDER BY b.views DESC NULLS LAST, b.created_at DESC
         LIMIT $4`,
        [userId, tenant, language, Math.min(Math.max(limit, 1), 50)]
    );
    return rows.map((r) => toBook(r, false));
}