/* eslint-disable @typescript-eslint/no-explicit-any */
import { dbPool } from "@/lib/db";
import { chapterHtml, previewHtml } from "@/lib/chapterHtml";

/*
 * Reader-facing queries against the production `stories` / `chapters` tables.
 *
 * A story is visible once it has at least one published chapter (and isn't deleted).
 *
 * Paywall: the book's latest signed contract (contracts.start_paywall_chapter, set in the admin) is the
 * first paid chapter number; 0 / none = no paywall. A translation uses its own signed contract if it has
 * one, otherwise its original's. Paid chapters only send a preview.
 *
 * Links: /stories/<genre slug>/<story slug>. The slug is saved on the story (stories.slug, kept unique and
 * updated on renames by the database). Old links still work: a renamed story's old slugs (book_slug_history),
 * its book_id (FS123) and its uuid all find it, and the result says `moved: true` so the page can switch
 * to the current link.
 *
 * Chapter numbers: the chapter's own chapter_number; older chapters without one use their position
 * among the story's published chapters.
 *
 * Chapter content is sent as cleaned HTML (see lib/chapterHtml.ts).
 */
const PUBLISHED_CHAPTER_STATUS = "published";
const SHORT_STORY_LENGTH_PATTERN = "short%";
// Only show stories distributed to this tenant (matched against stories.tenants). Unset = no filter.
const STORY_TENANT = process.env.STORY_TENANT || null;

const FALLBACK_COVER = "/fang_pictures/bookFace.png";
const PREVIEW_RATIO = 0.1;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type StorySort = "new" | "views" | "likes" | "recommended";

export interface StoryFilters {
    genre?: string | null;      // genre slug, e.g. "dark-romance"
    status?: "ongoing" | "completed" | null;
    short?: boolean;
    sort?: StorySort;
    exclude?: string | null;    // slug to leave out (e.g. the book being viewed)
    limit?: number;
}

// "Romántica Oscura" -> "romantica-oscura". Same rules as the database's fang_slugify() (used in genreSlugSql)
// and slugify() in components/home/bookBits.tsx, so links built anywhere filter correctly.
export function genreSlug(name: string): string {
    return (name ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ß/g, "ss")
        .replace(/[Łł]/g, "l")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

const genreSlugSql = (col: string) => `fang_slugify(${col})`;

function formatViews(views: number | null): string {
    const n = Number(views) || 0;
    if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}m`;
    if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}k`;
    return String(n);
}

// First paid chapter: the latest signed contract's start_paywall_chapter
// (the translation's own contract first, then its original's)
const PAYWALL_SQL = `
    (
        SELECT k.start_paywall_chapter FROM contracts k
        WHERE k.status = 'signed' AND (k.story_id = s.id OR k.story_id = s.original_story_id)
        ORDER BY (k.story_id = s.id) DESC, k.created_at DESC
        LIMIT 1
    )
`;

const STORY_COLUMNS = `
    s.id,
    COALESCE(s.slug, s.book_id, s.id::text) AS slug,
    s.title,
    p.name AS author,
    COALESCE(s.genre, '') AS genre,
    s.image,
    s.story_status,
    s.views,
    COALESCE(s.blurb, '') AS summary,
    COALESCE(s.label, '') AS label,
    COALESCE(s.tags, '{}') AS tags,
    s.rank,
    ${PAYWALL_SQL} AS start_paywall_chapter,
    (
        SELECT COUNT(*)::int FROM chapters c
        WHERE c.story_id = s.id AND c.status = '${PUBLISHED_CHAPTER_STATUS}'
    ) AS chapter_count
`;

// The author's newest profile (a plain join would repeat the story once per profile row)
const STORY_FROM = `
    FROM stories s
    LEFT JOIN LATERAL (
        SELECT COALESCE(NULLIF(trim(pen_name), ''), NULLIF(trim(full_name), ''), 'Unknown') AS name
        FROM user_profiles WHERE user_id = s.user_id ORDER BY created_at DESC LIMIT 1
    ) p ON true
`;

// Visibility rules shared by every reader query. Returns the WHERE fragments and their params.
// status is compared as-is (not lower()) so Postgres can use the published-chapters index.
function visibility(params: any[]): string[] {
    const where = [
        `s.is_deleted = false`,
        `EXISTS (SELECT 1 FROM chapters pc WHERE pc.story_id = s.id AND pc.status = '${PUBLISHED_CHAPTER_STATUS}')`,
    ];
    if (STORY_TENANT) {
        params.push(STORY_TENANT);
        where.push(`$${params.length} = ANY(s.tenants)`);
    }
    return where;
}

function toCard(row: any) {
    const genre = row.genre || "";
    const status = (row.story_status || "ongoing").toUpperCase();
    const paywall = Number(row.start_paywall_chapter);
    return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        author: row.author ?? "Unknown",
        genre,
        genreSlug: genreSlug(genre) || "all",
        image: row.image || FALLBACK_COVER,
        status,
        views: formatViews(row.views),
        blurb: row.summary,
        summary: row.summary,
        label: row.label,
        tags: row.tags ?? [],
        rank: row.rank,
        chapter: row.chapter_count,
        chapters: String(row.chapter_count),
        startPaywallChapter: Number.isFinite(paywall) && paywall > 0 ? paywall : null,
    };
}

export type StoryCard = ReturnType<typeof toCard>;

// A story found from a link. moved = found by an old link (renamed, book_id or uuid): show the current one instead.
export type StoryDetail = StoryCard & { moved: boolean };

export async function listStories(filters: StoryFilters = {}): Promise<StoryCard[]> {
    const params: any[] = [];
    const where = visibility(params);
    let join = "";

    if (filters.genre) {
        params.push(filters.genre);
        where.push(`(${genreSlugSql("s.genre")} = $${params.length} OR ${genreSlugSql("s.secondary_genre")} = $${params.length})`);
    }
    if (filters.status) {
        params.push(filters.status);
        where.push(`lower(s.story_status) = $${params.length}`);
    }
    if (filters.short) {
        params.push(SHORT_STORY_LENGTH_PATTERN);
        where.push(`s.story_length ILIKE $${params.length}`);
    }
    if (filters.exclude) {
        params.push(filters.exclude);
        where.push(`COALESCE(s.slug, s.book_id, s.id::text) <> $${params.length}`);
    }

    let orderBy: string;
    switch (filters.sort) {
        case "views":
            orderBy = "s.views DESC NULLS LAST, s.created_at DESC";
            break;
        case "likes":
            orderBy = "s.likes DESC NULLS LAST, s.views DESC NULLS LAST";
            break;
        case "recommended":
            join = `
                LEFT JOIN (
                    SELECT story_id, MAX(created_at) AS recommended_at
                    FROM story_recommendations GROUP BY story_id
                ) r ON r.story_id = s.id
            `;
            // Recommended stories first, then the rest by popularity
            orderBy = "r.recommended_at DESC NULLS LAST, s.views DESC NULLS LAST";
            break;
        default:
            orderBy = "s.created_at DESC";
    }

    const limit = Math.min(Math.max(Number(filters.limit) || 30, 1), 100);
    params.push(limit);

    const { rows } = await dbPool.query(
        `
        SELECT ${STORY_COLUMNS}
        ${STORY_FROM}
        ${join}
        WHERE ${where.join(" AND ")}
        ORDER BY ${orderBy}
        LIMIT $${params.length};
        `,
        params
    );

    return rows.map(toCard);
}

// The story a link points to: its current slug first, then an old slug of a renamed story,
// then the older link forms (book_id "FS123", or the uuid). Returns the story id and whether the link is old.
async function findStoryId(slug: string): Promise<{ id: string; moved: boolean } | null> {
    const asTyped = (slug ?? "").trim();
    if (!asTyped) return null;

    const { rows } = await dbPool.query(
        `
        SELECT id, moved FROM (
            SELECT s.id, false AS moved, 0 AS rank FROM stories s WHERE s.slug = $1
            UNION ALL
            SELECT h.book_id, true, 1 FROM book_slug_history h WHERE h.kind = 'story' AND h.slug = $1
            UNION ALL
            SELECT s.id, true, 2 FROM stories s WHERE s.book_id = $2 OR s.id = $3::uuid
        ) found
        ORDER BY rank
        LIMIT 1;
        `,
        // slugs are lower-case; book_id ("FS123") is matched as typed
        [asTyped.toLowerCase(), asTyped, UUID.test(asTyped) ? asTyped : null]
    );
    return rows[0] ? { id: rows[0].id, moved: rows[0].moved === true } : null;
}

export async function getStoryBySlug(slug: string): Promise<StoryDetail | null> {
    const found = await findStoryId(slug);
    if (!found) return null;

    const params: any[] = [found.id];
    const where = visibility(params);

    const { rows } = await dbPool.query(
        `
        SELECT ${STORY_COLUMNS}
        ${STORY_FROM}
        WHERE s.id = $1 AND ${where.join(" AND ")}
        LIMIT 1;
        `,
        params
    );

    return rows[0] ? { ...toCard(rows[0]), moved: found.moved } : null;
}

export async function listGenres() {
    const params: any[] = [];
    const where = visibility(params);

    const { rows } = await dbPool.query(
        `
        SELECT trim(s.genre) AS name, COUNT(*)::int AS story_count
        FROM stories s
        WHERE ${where.join(" AND ")} AND COALESCE(trim(s.genre), '') <> ''
        GROUP BY trim(s.genre)
        ORDER BY story_count DESC, name ASC;
        `,
        params
    );

    // Different spellings of a genre ("Dark Romance" / "dark romance") share a slug; merge them.
    const bySlug = new Map<string, { name: string; slug: string; story_count: number }>();
    for (const row of rows) {
        const slug = genreSlug(row.name);
        const existing = bySlug.get(slug);
        if (existing) existing.story_count += row.story_count;
        else bySlug.set(slug, { name: row.name, slug, story_count: row.story_count });
    }
    return [...bySlug.values()];
}

// The story's published chapters with their numbers: the saved chapter_number,
// or for older chapters without one, their position in publishing order.
const PUBLISHED_CHAPTERS_CTE = `
    WITH published AS (
        SELECT
            c.id,
            c.title,
            c.content,
            c.words,
            c.published_at,
            COALESCE(
                c.chapter_number,
                ROW_NUMBER() OVER (ORDER BY COALESCE(c.published_at, c.created_at), c.created_at, c.id)
            )::int AS chapter_number
        FROM chapters c
        WHERE c.story_id = $1 AND c.status = '${PUBLISHED_CHAPTER_STATUS}'
    )
`;

// Paid from the paywall chapter onwards (null = no paywall)
function isLocked(chapterNumber: number, startPaywallChapter: number | null) {
    return startPaywallChapter != null && startPaywallChapter > 0 && chapterNumber >= startPaywallChapter;
}

export async function listChapters(story: StoryCard) {
    const { rows } = await dbPool.query(
        `
        ${PUBLISHED_CHAPTERS_CTE}
        SELECT id, title, words, published_at, chapter_number
        FROM published
        ORDER BY chapter_number ASC;
        `,
        [story.id]
    );

    return rows.map((ch) => ({
        id: ch.id,
        book_id: story.slug,
        chapter_number: ch.chapter_number,
        title: ch.title,
        words: ch.words,
        published_at: ch.published_at,
        isLocked: isLocked(ch.chapter_number, story.startPaywallChapter),
    }));
}

export async function getChapter(story: StoryCard, chapterNumber: number) {
    const { rows } = await dbPool.query(
        `
        ${PUBLISHED_CHAPTERS_CTE}
        SELECT id, title, content, words, published_at, chapter_number
        FROM published
        WHERE chapter_number = $2
        LIMIT 1;
        `,
        [story.id, chapterNumber]
    );

    const ch = rows[0];
    if (!ch) return null;

    const locked = isLocked(ch.chapter_number, story.startPaywallChapter);

    // Cleaned HTML. A paywalled chapter only sends its first paragraphs, never the full text.
    const html = chapterHtml(ch.content);
    const content = locked ? previewHtml(html, PREVIEW_RATIO) : html;

    return {
        id: ch.id,
        book_id: story.slug,
        chapter_number: ch.chapter_number,
        title: ch.title,
        words: ch.words,
        published_at: ch.published_at,
        content,
        isLocked: locked,
    };
}

/*
 * Writes (story create/update for writers & admins). Field names match the old /api/books
 * payload: summary → blurb, status → story_status ("ongoing" | "completed").
 * The database sets and updates the slug itself (on create, and when the title changes).
 */
export interface StoryInput {
    title?: string;
    summary?: string;
    image?: string;
    genre?: string;
    secondaryGenre?: string;
    status?: string;
    label?: string;
    tags?: string[];
    language?: string;
}

export async function createStory(userId: string, input: StoryInput) {
    const { rows } = await dbPool.query(
        `
        INSERT INTO stories (
            user_id, book_id, title, blurb, image, genre, secondary_genre,
            story_status, label, tags, language
        )
        VALUES ($1, nextval('story_book_id_seq')::text, $2, $3, $4, $5, $6, COALESCE($7, 'ongoing'), $8, $9, $10)
        RETURNING id, COALESCE(slug, book_id, id::text) AS slug;
        `,
        [
            userId,
            input.title,
            input.summary ?? null,
            input.image ?? null,
            input.genre ?? null,
            input.secondaryGenre ?? null,
            input.status ?? null,
            input.label ?? null,
            input.tags ?? [],
            input.language ?? null,
        ]
    );

    return rows[0];
}

export async function storyBelongsToUser(slug: string, userId: string) {
    const found = await findStoryId(slug);
    if (!found) return false;
    const { rows } = await dbPool.query(
        `SELECT 1 FROM stories WHERE id = $1 AND user_id = $2 AND is_deleted = false`,
        [found.id, userId]
    );

    return rows.length > 0;
}

export async function updateStoryBySlug(slug: string, input: StoryInput) {
    const columns: Record<string, unknown> = {
        title: input.title,
        blurb: input.summary,
        image: input.image,
        genre: input.genre,
        secondary_genre: input.secondaryGenre,
        story_status: input.status,
        label: input.label,
        tags: input.tags,
        language: input.language,
    };

    const fields: string[] = [];
    const values: any[] = [];

    for (const [column, value] of Object.entries(columns)) {
        if (value === undefined) continue;
        values.push(value);
        fields.push(`${column} = $${values.length}`);
    }

    if (fields.length === 0) {
        return null;
    }

    const found = await findStoryId(slug);
    if (!found) return null;
    values.push(found.id);

    const { rows } = await dbPool.query(
        `
        UPDATE stories
        SET ${fields.join(", ")}, updated_on = NOW()
        WHERE id = $${values.length} AND is_deleted = false
        RETURNING id, COALESCE(slug, book_id, id::text) AS slug;
        `,
        values
    );

    return rows[0] || null;
}