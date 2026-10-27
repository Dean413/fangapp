/* eslint-disable @typescript-eslint/no-explicit-any */
import { dbPool } from "@/lib/db";
import { chapterHtml, previewHtml } from "@/lib/chapterHtml";
import { chapterWords, getReaderAccess, priceForWords } from "@/lib/unlock";

const PUBLISHED_CHAPTER_STATUS = "published";
const SHORT_STORY_LENGTH_PATTERN = "short%";
// Only show stories distributed to this tenant (matched against stories.tenants). Unset = no filter.
const STORY_TENANT = process.env.STORY_TENANT || null;
// Books owned by the platform account show no author
const PLATFORM_OWNER = `COALESCE(su.role, '') LIKE 'platform%'`;

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
    language?: string | null;   // only books in this language, as saved on the stories (e.g. "English")
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
    CASE WHEN ${PLATFORM_OWNER} THEN '' ELSE p.name END AS author,
    CASE WHEN ${PLATFORM_OWNER} THEN NULL ELSE p.pen_slug END AS author_slug,
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
    LEFT JOIN users su ON su.id = s.user_id
    LEFT JOIN LATERAL (
        SELECT COALESCE(NULLIF(trim(pen_name), ''), NULLIF(trim(full_name), ''), 'Unknown') AS name,
        CASE WHEN NULLIF(trim(pen_name), '') IS NULL THEN NULL ELSE fang_slugify(pen_name) END AS pen_slug
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
        authorSlug: row.author_slug ?? null,
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
    if (filters.language) {
        params.push(filters.language);
        where.push(`s.language = $${params.length}`);
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

    // Each book's average rating (null = no reviews yet)
    const ratingJoin = `
        LEFT JOIN LATERAL (
            SELECT round(avg(r.rating), 1) AS rating
            FROM book_reviews r WHERE r.story_id = s.id AND NOT r.hidden
        ) rv ON true
    `;

    const limit = Math.min(Math.max(Number(filters.limit) || 30, 1), 100);
    params.push(limit);

    const { rows } = await dbPool.query(
        `
        SELECT ${STORY_COLUMNS}, rv.rating
        ${STORY_FROM}
        ${join}
        ${ratingJoin}
        WHERE ${where.join(" AND ")}
        ORDER BY ${orderBy}
        LIMIT $${params.length};
        `,
        params
    );

    return rows.map((r) => ({ ...toCard(r), rating: r.rating != null ? Number(r.rating) : null }));
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

// viewerId: the signed-in reader (null = signed out). Paid chapters they unlocked, or all of them for the
// book's writer, show as unlocked.
export async function listChapters(story: StoryCard, viewerId: string | null = null) {
    const [{ rows }, access] = await Promise.all([
        dbPool.query(
            `
            ${PUBLISHED_CHAPTERS_CTE}
            SELECT id, title, words, published_at, chapter_number,
                   -- length for the price: the saved count, otherwise counted from the text
                   COALESCE(NULLIF(words, 0), array_length(regexp_split_to_array(
                       trim(regexp_replace(COALESCE(content, ''), '<[^>]*>', ' ', 'g')), '\\s+'), 1), 0) AS word_count
            FROM published
            ORDER BY chapter_number ASC;
            `,
            [story.id]
        ),
        getReaderAccess(viewerId, String(story.id)),
    ]);

    return rows.map((ch) => {
        const paid = isLocked(ch.chapter_number, story.startPaywallChapter);
        const open = access.isWriter || access.unlocked.has(String(ch.id));
        return {
            id: ch.id,
            book_id: story.slug,
            chapter_number: ch.chapter_number,
            title: ch.title,
            words: ch.words,
            published_at: ch.published_at,
            isPaid: paid,
            price: paid ? priceForWords(Number(ch.word_count) || 0) : 0,
            isLocked: paid && !open,
        };
    });
}

export async function getChapter(story: StoryCard, chapterNumber: number, viewerId: string | null = null) {
    const [{ rows }, access] = await Promise.all([
        dbPool.query(
            `
            ${PUBLISHED_CHAPTERS_CTE}
            SELECT id, title, content, words, published_at, chapter_number
            FROM published
            WHERE chapter_number = $2
            LIMIT 1;
            `,
            [story.id, chapterNumber]
        ),
        getReaderAccess(viewerId, String(story.id)),
    ]);

    const ch = rows[0];
    if (!ch) return null;

    const paid = isLocked(ch.chapter_number, story.startPaywallChapter);
    const locked = paid && !(access.isWriter || access.unlocked.has(String(ch.id)));

    // Cleaned HTML. A locked chapter only sends its first paragraphs, never the full text.
    const html = chapterHtml(ch.content);
    const content = locked ? previewHtml(html, PREVIEW_RATIO) : html;

    // A locked chapter: the first earlier paid chapter this reader hasn't unlocked (unlocking goes in order)
    let firstLocked: number | null = null;
    if (locked && viewerId && story.startPaywallChapter) {
        const { rows: earlier } = await dbPool.query(
            `${PUBLISHED_CHAPTERS_CTE}
             SELECT min(chapter_number)::int AS first FROM published
             WHERE chapter_number >= $2 AND chapter_number < $3
               AND NOT EXISTS (SELECT 1 FROM chapter_unlocks u WHERE u.user_id = $4 AND u.chapter_id = published.id)`,
            [story.id, story.startPaywallChapter, ch.chapter_number, viewerId]
        );
        firstLocked = earlier[0]?.first != null ? Number(earlier[0].first) : null;
    }

    return {
        id: ch.id,
        book_id: story.slug,
        chapter_number: ch.chapter_number,
        title: ch.title,
        words: ch.words,
        published_at: ch.published_at,
        content,
        isPaid: paid,
        price: paid ? priceForWords(chapterWords(ch.words, html)) : 0,
        isLocked: locked,
        autoUnlock: access.autoUnlock,
        firstLocked
    };
}

// You May Like for a book (book page and reader): the same writer's other books first, then books in the same
// genre (primary or secondary), the most viewed first. Only books in `language` (the language the reader picked
// on the site; when not given, the book's own language). Never the book itself.
export async function listYouMayLike(storyId: string, language: string | null, limitValue = 14): Promise<StoryCard[]> {
    const params: any[] = [];
    const where = visibility(params);

    params.push(storyId);
    const book = `$${params.length}`;
    // The book being read or viewed
    const current = `(SELECT b.user_id, b.language, ${genreSlugSql("b.genre")} AS g1, ${genreSlugSql("b.secondary_genre")} AS g2
                      FROM stories b WHERE b.id = ${book})`;
    const sameAuthor = `(s.user_id = cur.user_id)`;
    const sameGenre = `(${genreSlugSql("s.genre")} IN (cur.g1, cur.g2) OR ${genreSlugSql("s.secondary_genre")} IN (cur.g1, cur.g2))`;

    where.push(`s.id <> ${book}`);
    where.push(`(${sameAuthor} OR COALESCE(${sameGenre}, false))`);
    params.push(language);
    where.push(`s.language = COALESCE($${params.length}::text, cur.language)`);

    const limit = Math.min(Math.max(Number(limitValue) || 14, 1), 50);
    params.push(limit);

    const { rows } = await dbPool.query(
        `
        SELECT ${STORY_COLUMNS}
        ${STORY_FROM}
        CROSS JOIN ${current} cur
        WHERE ${where.join(" AND ")}
        ORDER BY ${sameAuthor} DESC, s.views DESC NULLS LAST, s.created_at DESC
        LIMIT $${params.length};
        `,
        params
    );
    return rows.map(toCard);
}

// Search across all books: title, author (pen name) and tags. Titles starting with the words come first,
// then titles containing them, then the rest, the most viewed first. Only books in `language` when given.
export async function searchStories(query: string, language: string | null, limitValue = 20): Promise<StoryCard[]> {
    const q = query.trim().replace(/\s+/g, " ").slice(0, 80);
    if (q.length < 2) return [];

    const params: any[] = [];
    const where = visibility(params);

    // The words as typed, with LIKE's own wildcards (% _ \) taken literally
    const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`);
    params.push(`%${escaped}%`);
    const contains = `$${params.length}`;
    params.push(`${escaped}%`);
    const starts = `$${params.length}`;

    where.push(`(
        s.title ILIKE ${contains}
        OR (NOT ${PLATFORM_OWNER} AND p.name ILIKE ${contains})
        OR EXISTS (SELECT 1 FROM unnest(COALESCE(s.tags, '{}')) t(tag) WHERE t.tag ILIKE ${contains})
    )`);
    if (language) {
        params.push(language);
        where.push(`s.language = $${params.length}`);
    }

    const limit = Math.min(Math.max(Number(limitValue) || 20, 1), 60);
    params.push(limit);

    const { rows } = await dbPool.query(
        `
        SELECT ${STORY_COLUMNS}
        ${STORY_FROM}
        WHERE ${where.join(" AND ")}
        ORDER BY (s.title ILIKE ${starts}) DESC, (s.title ILIKE ${contains}) DESC, s.views DESC NULLS LAST
        LIMIT $${params.length};
        `,
        params
    );
    return rows.map(toCard);
}


// ---------- Genres from the admin's Curation → Genre ----------
const READER_TENANT = "fang"; // this app's tenant id in the admin
const READER_PLATFORM = "Websites";

// The genre pills: enabled genre curations for this language, in the admin's order. A genre with no live books is left out.
export async function listCuratedGenres(language: string) {
    const { rows } = await dbPool.query(
        `
        SELECT o.name, fang_slugify(o.name) AS slug
        FROM curation_collections cc
        JOIN metadata_options o ON o.id = cc.genre_option_id AND o.enabled
        WHERE cc.section = 'genre' AND cc.enabled
          AND cc.tenant = $1 AND cc.language = $2 AND cc.platform = $3
          AND EXISTS (
              SELECT 1 FROM curation_items i
              JOIN stories s ON s.id = i.story_id
              WHERE i.collection_id = cc.id
                AND s.is_deleted = false
                AND $1 = ANY(s.tenants)
                AND EXISTS (SELECT 1 FROM chapters pc WHERE pc.story_id = s.id AND pc.status = '${PUBLISHED_CHAPTER_STATUS}')
          )
        ORDER BY cc.display_order, cc.created_at
        `,
        [READER_TENANT, language, READER_PLATFORM]
    );
    return rows.map((r) => ({ name: r.name as string, slug: r.slug as string }));
}

// One genre's books, in the order the admin set
export async function listCuratedGenreBooks(genre: string, language: string, limit?: number): Promise<StoryCard[]> {
    const params: any[] = [READER_TENANT, language, READER_PLATFORM, genre];
    const where = visibility(params);
    params.push(Math.min(Math.max(Number(limit) || 60, 1), 100));

    const { rows } = await dbPool.query(
        `
        SELECT ${STORY_COLUMNS}, rv.rating
        ${STORY_FROM}
        JOIN curation_items i ON i.story_id = s.id
        JOIN curation_collections cc ON cc.id = i.collection_id
        JOIN metadata_options o ON o.id = cc.genre_option_id
        LEFT JOIN LATERAL (
            SELECT round(avg(r.rating), 1) AS rating
            FROM book_reviews r WHERE r.story_id = s.id AND NOT r.hidden
        ) rv ON true
        WHERE cc.section = 'genre' AND cc.enabled AND o.enabled
          AND cc.tenant = $1 AND cc.language = $2 AND cc.platform = $3
          AND fang_slugify(o.name) = $4
          AND $1 = ANY(s.tenants)
          AND ${where.join(" AND ")}
        ORDER BY i.position, i.created_at
        LIMIT $${params.length}
        `,
        params
    );

    return rows.map((r) => ({ ...toCard(r), rating: r.rating != null ? Number(r.rating) : null }));
}

// "All" on the genre page: every book in any enabled genre curation for this language, each once.
// Ordered by the genre's place in the admin's order, then the book's position in that genre.
export async function listCuratedAllBooks(language: string, limit?: number): Promise<StoryCard[]> {
    const params: any[] = [READER_TENANT, language, READER_PLATFORM];
    const where = visibility(params);
    params.push(Math.min(Math.max(Number(limit) || 200, 1), 500));

    const { rows } = await dbPool.query(
        `
        SELECT * FROM (
            SELECT DISTINCT ON (s.id)
                   ${STORY_COLUMNS}, rv.rating,
                   cc.display_order AS genre_order, i.position AS item_position
            ${STORY_FROM}
            JOIN curation_items i ON i.story_id = s.id
            JOIN curation_collections cc ON cc.id = i.collection_id
            JOIN metadata_options o ON o.id = cc.genre_option_id
            LEFT JOIN LATERAL (
                SELECT round(avg(r.rating), 1) AS rating
                FROM book_reviews r WHERE r.story_id = s.id AND NOT r.hidden
            ) rv ON true
            WHERE cc.section = 'genre' AND cc.enabled AND o.enabled
              AND cc.tenant = $1 AND cc.language = $2 AND cc.platform = $3
              AND $1 = ANY(s.tenants)
              AND ${where.join(" AND ")}
            ORDER BY s.id, cc.display_order, i.position
        ) books
        ORDER BY genre_order, item_position
        LIMIT $${params.length}
        `,
        params
    );

    return rows.map((r) => ({ ...toCard(r), rating: r.rating != null ? Number(r.rating) : null }));
}