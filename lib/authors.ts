// lib/authors.ts
// Author pages and following. An author is a writer's pen name (user_profiles.pen_name, unique);
// the page address is the pen name as a slug (/authors/black-barbie, same slug rules as the genres).
import "server-only";
import { dbPool } from "@/lib/db";
import { genreSlug } from "@/lib/stories";

// Only show books distributed to this tenant (matched against stories.tenants). Unset = no filter.
const STORY_TENANT = process.env.STORY_TENANT || null;
const PUBLISHED_CHAPTER_STATUS = "published";
const FALLBACK_COVER = "/fang_pictures/bookFace.png";
// A reader can follow this many authors in a minute (stops scripts), and this many in all
const FOLLOWS_PER_MINUTE = 20;
const MAX_FOLLOWING = 1000;
const SLUG_MAX_LENGTH = 120;
const AUTHOR_BOOKS_LIMIT = 100;
const FOLLOWING_LIST_LIMIT = 100;

export type AuthorProfile = { userId: string; penName: string; slug: string; image: string | null };

export type AuthorBook = {
    id: string;
    href: string;
    title: string;
    image: string;
    genre: string;
    tags: string[];
    summary: string;
    status: string;           // ONGOING | COMPLETED
    views: number;
    rating: number | null;    // average from the reviews (null = no reviews yet)
};

// The author a page address points to (null = no such author)
export async function findAuthor(slug: string): Promise<AuthorProfile | null> {
    const clean = String(slug ?? "").trim().toLowerCase();
    if (!clean || clean.length > SLUG_MAX_LENGTH) return null;

    const { rows } = await dbPool.query(
        `SELECT up.user_id, trim(up.pen_name) AS pen_name, up.profile_image
         FROM user_profiles up
         JOIN users u ON u.id = up.user_id
         WHERE NULLIF(trim(up.pen_name), '') IS NOT NULL
           AND fang_slugify(up.pen_name) = $1
           AND COALESCE(u.role, '') NOT LIKE 'platform%'
         ORDER BY up.created_at DESC
         LIMIT 1`,
        [clean]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        userId: String(row.user_id),
        penName: row.pen_name,
        slug: clean,
        image: row.profile_image ? String(row.profile_image) : null,
    };
}

export type AuthorPage = {
    author: AuthorProfile;
    followers: number;
    following: boolean;   // the signed-in reader follows this author
    isSelf: boolean;      // the signed-in reader is this author
    books: AuthorBook[];
};

// Everything the author page shows. null = no such author, or no published books yet.
export async function getAuthorPage(slug: string, viewerId: string | null): Promise<AuthorPage | null> {
    const author = await findAuthor(slug);
    if (!author) return null;

    const [booksRes, followRes] = await Promise.all([
        dbPool.query(
            `SELECT s.id,
                    COALESCE(s.slug, s.book_id, s.id::text) AS slug,
                    s.title,
                    s.image,
                    COALESCE(s.genre, '') AS genre,
                    COALESCE(s.tags, '{}') AS tags,
                    COALESCE(s.blurb, '') AS summary,
                    s.story_status,
                    s.views,
                    (SELECT round(avg(r.rating), 1) FROM book_reviews r WHERE r.story_id = s.id AND NOT r.hidden) AS rating
             FROM stories s
             WHERE s.user_id = $1
               AND s.is_deleted = false
               AND EXISTS (SELECT 1 FROM chapters c WHERE c.story_id = s.id AND c.status = '${PUBLISHED_CHAPTER_STATUS}')
               AND ($2::text IS NULL OR $2 = ANY(s.tenants))
             ORDER BY s.views DESC NULLS LAST, s.created_at DESC
             LIMIT ${AUTHOR_BOOKS_LIMIT}`,
            [author.userId, STORY_TENANT]
        ),
        dbPool.query(
            `SELECT (SELECT count(*)::int FROM author_follows WHERE author_id = $1) AS followers,
                    EXISTS (SELECT 1 FROM author_follows WHERE author_id = $1 AND reader_id = $2::uuid) AS following`,
            [author.userId, viewerId]
        ),
    ]);

    if (booksRes.rows.length === 0) return null;

    const books: AuthorBook[] = booksRes.rows.map((row) => ({
        id: String(row.id),
        href: `/stories/${genreSlug(row.genre) || "all"}/${row.slug}`,
        title: row.title,
        image: row.image || FALLBACK_COVER,
        genre: row.genre,
        tags: Array.isArray(row.tags) ? row.tags : [],
        summary: row.summary,
        status: String(row.story_status || "ongoing").toUpperCase(),
        views: Number(row.views) || 0,
        rating: row.rating != null ? Number(row.rating) : null,
    }));

    return {
        author,
        followers: Number(followRes.rows[0]?.followers) || 0,
        following: followRes.rows[0]?.following === true,
        isSelf: viewerId !== null && viewerId === author.userId,
        books,
    };
}

export type FollowResult =
    | { ok: true; followers: number; following: boolean }
    | { ok: false; code: "NOT_FOUND" | "SELF" | "TOO_FAST" | "TOO_MANY" };

// Follow (follow = true) or unfollow an author. Doing either twice changes nothing.
export async function setFollow(readerId: string, slug: string, follow: boolean): Promise<FollowResult> {
    const author = await findAuthor(slug);
    if (!author) return { ok: false, code: "NOT_FOUND" };
    if (author.userId === readerId) return { ok: false, code: "SELF" };

    if (follow) {
        const { rows } = await dbPool.query(
            `SELECT count(*) FILTER (WHERE created_at > now() - interval '1 minute')::int AS recent,
                    count(*)::int AS total
             FROM author_follows WHERE reader_id = $1`,
            [readerId]
        );
        if (Number(rows[0]?.recent) >= FOLLOWS_PER_MINUTE) return { ok: false, code: "TOO_FAST" };
        if (Number(rows[0]?.total) >= MAX_FOLLOWING) return { ok: false, code: "TOO_MANY" };

        await dbPool.query(
            `INSERT INTO author_follows (reader_id, author_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [readerId, author.userId]
        );
    } else {
        await dbPool.query(`DELETE FROM author_follows WHERE reader_id = $1 AND author_id = $2`, [readerId, author.userId]);
    }

    const { rows } = await dbPool.query(`SELECT count(*)::int AS followers FROM author_follows WHERE author_id = $1`, [author.userId]);
    return { ok: true, followers: Number(rows[0]?.followers) || 0, following: follow };
}

export type FollowedAuthor = { slug: string; penName: string; image: string | null };

// The authors a reader follows, newest first (for the reader's profile)
export async function listFollowing(readerId: string): Promise<{ total: number; authors: FollowedAuthor[] }> {
    const [list, total] = await Promise.all([
        dbPool.query(
            `SELECT fang_slugify(a.pen_name) AS slug, a.pen_name, a.profile_image
             FROM author_follows f
             JOIN LATERAL (
                 SELECT trim(up.pen_name) AS pen_name, up.profile_image
                 FROM user_profiles up
                 WHERE up.user_id = f.author_id AND NULLIF(trim(up.pen_name), '') IS NOT NULL
                 ORDER BY up.created_at DESC LIMIT 1
             ) a ON true
             WHERE f.reader_id = $1
             ORDER BY f.created_at DESC
             LIMIT ${FOLLOWING_LIST_LIMIT}`,
            [readerId]
        ),
        dbPool.query(`SELECT count(*)::int AS n FROM author_follows WHERE reader_id = $1`, [readerId]),
    ]);
    return {
        total: Number(total.rows[0]?.n) || 0,
        authors: list.rows.map((r) => ({ slug: r.slug, penName: r.pen_name, image: r.profile_image ? String(r.profile_image) : null })),
    };
}