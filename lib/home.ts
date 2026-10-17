// app/lib/home.ts
// The Home rows the admin set up in Multi-Tenant Curation (Editor's Picks, Top Trending, Fang Originals, ...).
// Server only: call it from a Server Component.
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
           b.story_status AS progress, p.name AS author, ct.plan
    FROM curation_items i
    JOIN stories b ON b.id = i.story_id
    ${AUTHOR}
    ${SIGNED_PLAN("story_id")}
    WHERE i.collection_id = ANY($1::bigint[])
      AND COALESCE(b.is_deleted, false) = false
      AND $2 = ANY(b.tenants)
      AND EXISTS (SELECT 1 FROM chapters c WHERE c.story_id = b.id AND c.status = 'published')
    ORDER BY i.position, i.created_at`;

const COMIC_ITEMS = `
    SELECT i.collection_id::text AS collection_id, b.id, b.slug, b.title, b.cover_image AS image, b.genre, b.tags,
           b.description AS blurb, b.views, b.status AS progress, p.name AS author, ct.plan
    FROM curation_items i
    JOIN comics b ON b.id = i.comic_id
    ${AUTHOR}
    ${SIGNED_PLAN("comic_id")}
    WHERE i.collection_id = ANY($1::bigint[])
      AND COALESCE(b.is_deleted, false) = false
      AND $2 = ANY(b.tenants)
      AND EXISTS (SELECT 1 FROM comic_episodes e WHERE e.comic_id = b.id AND e.status = 'published')
    ORDER BY i.position, i.created_at`;

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
            books: items
                .filter((r) => r.collection_id === c.id)
                .map(
                    (r): HomeBook => ({
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
                    })
                ),
        }))
        .filter((c) => c.books.length > 0); // hide empty rows
}