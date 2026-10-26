import "server-only";
import { dbPool } from "@/lib/db";
import { genreSlug, getStoryBySlug } from "@/lib/stories";
import { canReadPaid } from "@/lib/unlock";

export type LibraryTab = "reading" | "viewed" | "finished";
export const LIBRARY_TABS: LibraryTab[] = ["reading", "viewed", "finished"];

const MAX_SAVED = 1000;
const MAX_LISTED = 200;
const FALLBACK_COVER = "/fang_pictures/bookFace.png";
const STORY_TENANT = process.env.STORY_TENANT || null;
// A book counts as "Updated" for this many days after its newest chapter comes out (until the reader reads it)
const UPDATED_DAYS = 7;

export type LibraryBook = {
    id: string;              // the book's current link id (slug)
    storyId: string;
    title: string;
    image: string;
    saved: boolean;
    lastChapter: number | null;    // last chapter opened
    chapterCount: number;
    finished: boolean;
    completed: boolean;            // the writer marked the book completed (else ongoing)
    exclusive: boolean;            // under a signed Exclusive or MAB-Exclusive contract
    updated: boolean;              // a chapter came out in the last few days and this reader hasn't read it yet
    href: string;                  // where tapping the book goes (the last chapter read, or chapter 1)
};

// Visible books only (same rules as lib/stories.ts), with the numbers needed for the tabs
const BOOK_SELECT = `
    SELECT s.id::text AS story_id,
           COALESCE(s.slug, s.book_id, s.id::text) AS slug,
           s.title, s.image, COALESCE(s.genre, '') AS genre,
           lower(COALESCE(s.story_status, '')) AS story_status,
           ch.chapter_count, ch.last_number, ch.last_published_at,
           p.last_chapter, p.max_chapter, p.last_read_at,
           l.added_at,
           (l.user_id IS NOT NULL) AS saved,
           ct.plan
`;

// The contract the book is under: the newest signed one (for the Exclusive ribbon)
const SIGNED_PLAN = `
    LEFT JOIN LATERAL (
        SELECT k.plan_id::text AS plan FROM contracts k
        WHERE k.story_id = s.id AND k.status = 'signed'
        ORDER BY k.created_at DESC LIMIT 1
    ) ct ON true
`;

const CHAPTER_NUMBERS = `
    LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS chapter_count, COALESCE(MAX(n), 0)::int AS last_number, MAX(pub) AS last_published_at
        FROM (
            SELECT COALESCE(c.chapter_number,
                            ROW_NUMBER() OVER (ORDER BY COALESCE(c.published_at, c.created_at), c.created_at, c.id))::int AS n,
                   COALESCE(c.published_at, c.created_at) AS pub
            FROM chapters c WHERE c.story_id = s.id AND c.status = 'published'
        ) numbered
    ) ch ON true
`;

const VISIBLE = `
    s.is_deleted = false
    AND ch.chapter_count > 0
    AND ($2::text IS NULL OR $2 = ANY(s.tenants))
`;

// A book whose last published chapter the reader has read (ongoing or completed)
const FINISHED = `(ch.last_number > 0 AND COALESCE(p.max_chapter, 0) >= ch.last_number)`;

function toBook(r: any): LibraryBook {
    const lastNumber = Number(r.last_number) || 0;
    const finished = lastNumber > 0 && Number(r.max_chapter ?? 0) >= lastNumber;
    const lastChapter = r.last_chapter != null ? Number(r.last_chapter) : null;
    const recent =
        r.last_published_at != null &&
        Date.now() - new Date(r.last_published_at).getTime() < UPDATED_DAYS * 86400000;
    return {
        id: r.slug,
        storyId: r.story_id,
        title: r.title,
        image: r.image || FALLBACK_COVER,
        saved: r.saved === true,
        lastChapter,
        chapterCount: Number(r.chapter_count) || 0,
        finished,
        completed: r.story_status === "completed",
        exclusive: r.plan === "exclusive" || r.plan === "mab-exclusive",
        updated: recent && Number(r.max_chapter ?? 0) < lastNumber,
        href: `/stories/${genreSlug(r.genre) || "all"}/${r.slug}/reader?chapter=${lastChapter ?? 1}`,
    };
}

export async function listLibrary(userId: string, tab: LibraryTab): Promise<LibraryBook[]> {
    let sql: string;
    if (tab === "reading") {
        sql = `
            ${BOOK_SELECT}
            FROM reader_library l
            JOIN stories s ON s.id = l.story_id
            LEFT JOIN reading_progress p ON p.user_id = l.user_id AND p.story_id = s.id
            ${CHAPTER_NUMBERS}
            ${SIGNED_PLAN}
            WHERE l.user_id = $1 AND ${VISIBLE} AND NOT ${FINISHED}
            ORDER BY COALESCE(p.last_read_at, l.added_at) DESC
            LIMIT ${MAX_LISTED}`;
    } else {
        sql = `
            ${BOOK_SELECT}
            FROM reading_progress p
            JOIN stories s ON s.id = p.story_id
            LEFT JOIN reader_library l ON l.user_id = p.user_id AND l.story_id = s.id
            ${CHAPTER_NUMBERS}
            ${SIGNED_PLAN}
            WHERE p.user_id = $1 AND ${VISIBLE} ${tab === "finished" ? `AND ${FINISHED}` : ""}
            ORDER BY p.last_read_at DESC
            LIMIT ${MAX_LISTED}`;
    }
    const { rows } = await dbPool.query(sql, [userId, STORY_TENANT]);
    return rows.map(toBook);
}

// Every saved book's ids (for "is this saved?" on story and reading pages)
export async function listSavedIds(userId: string): Promise<{ id: string; storyId: string }[]> {
    const { rows } = await dbPool.query(
        `SELECT COALESCE(s.slug, s.book_id, s.id::text) AS slug, s.id::text AS story_id
         FROM reader_library l JOIN stories s ON s.id = l.story_id
         WHERE l.user_id = $1 AND s.is_deleted = false`,
        [userId]
    );
    return rows.map((r) => ({ id: r.slug, storyId: r.story_id }));
}

export type AddResult = "ADDED" | "NOT_FOUND" | "FULL";

export async function addToLibrary(userId: string, bookId: string): Promise<AddResult> {
    const story = await getStoryBySlug(bookId);
    if (!story) return "NOT_FOUND";
    const { rows } = await dbPool.query(
        `INSERT INTO reader_library (user_id, story_id)
         SELECT $1, $2
         WHERE (SELECT COUNT(*) FROM reader_library WHERE user_id = $1) < $3
         ON CONFLICT DO NOTHING
         RETURNING 1`,
        [userId, story.id, MAX_SAVED]
    );
    if (rows[0]) return "ADDED";
    const { rowCount } = await dbPool.query(`SELECT 1 FROM reader_library WHERE user_id = $1 AND story_id = $2`, [userId, story.id]);
    return rowCount ? "ADDED" : "FULL";
}

// Matches the ids the app uses for a book: current slug, book_id or uuid
const MATCH_IDS = `
    SELECT s.id FROM stories s
    WHERE s.slug = ANY($2::text[]) OR s.book_id = ANY($2::text[]) OR s.id::text = ANY($2::text[])
`;

// Removes books from the library ("reading") or from the reading history ("viewed" / "finished")
export async function removeBooks(userId: string, ids: string[], from: "library" | "history") {
    const clean = [...new Set(ids.filter((id) => typeof id === "string" && id.length <= 200))].slice(0, MAX_LISTED);
    if (clean.length === 0) return 0;
    const table = from === "library" ? "reader_library" : "reading_progress";
    const { rowCount } = await dbPool.query(
        `DELETE FROM ${table} WHERE user_id = $1 AND story_id IN (${MATCH_IDS})`,
        [userId, clean]
    );
    return rowCount ?? 0;
}

// Records the chapter a reader opened. Only real published chapters count; paid chapters the reader hasn't
// unlocked update "last opened" but don't count as read for Finished.
export async function recordProgress(userId: string, bookId: string, chapterNumber: number) {
    if (!Number.isInteger(chapterNumber) || chapterNumber < 1 || chapterNumber > 100000) return false;
    const story = await getStoryBySlug(bookId);
    if (!story) return false;

    const { rows } = await dbPool.query(
        `SELECT id FROM (
             SELECT c.id::text AS id,
                    COALESCE(c.chapter_number,
                             ROW_NUMBER() OVER (ORDER BY COALESCE(c.published_at, c.created_at), c.created_at, c.id))::int AS n
             FROM chapters c WHERE c.story_id = $1 AND c.status = 'published'
         ) numbered WHERE n = $2 LIMIT 1`,
        [story.id, chapterNumber]
    );
    if (!rows[0]) return false;

    // A paid chapter only counts as read once this reader unlocked it (or wrote the book)
    const paywall = story.startPaywallChapter;
    const paid = paywall != null && paywall > 0 && chapterNumber >= paywall;
    const locked = paid && !(await canReadPaid(userId, String(story.id), rows[0].id));
    await dbPool.query(
        `INSERT INTO reading_progress (user_id, story_id, last_chapter, max_chapter, last_read_at)
         VALUES ($1, $2, $3, $4, now())
         ON CONFLICT (user_id, story_id) DO UPDATE SET
             last_chapter = EXCLUDED.last_chapter,
             max_chapter  = GREATEST(reading_progress.max_chapter, EXCLUDED.max_chapter),
             last_read_at = now()`,
        [userId, story.id, chapterNumber, locked ? 0 : chapterNumber]
    );
    return true;
}

// For a story page: is it saved, and which chapter to continue from
export async function getBookStatus(userId: string, bookId: string) {
    const story = await getStoryBySlug(bookId);
    if (!story) return null;
    const { rows } = await dbPool.query(
        `SELECT EXISTS (SELECT 1 FROM reader_library WHERE user_id = $1 AND story_id = $2) AS saved,
                (SELECT last_chapter FROM reading_progress WHERE user_id = $1 AND story_id = $2) AS last_chapter`,
        [userId, story.id]
    );
    return { saved: rows[0].saved === true, lastChapter: rows[0].last_chapter != null ? Number(rows[0].last_chapter) : null };
}