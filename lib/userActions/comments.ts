// lib/comments.ts
// Chapter comments, in FangWriters' `comments` table, so writers see and moderate readers' comments there.
// Reader comments are saved with platform 'Fang' and the account's user_id.
//  - comments and one level of replies (a reply to a reply goes under the same comment)
//  - comments the writer blocked aren't shown
//  - the writer of the book is marked as the author when they comment from the reader app
/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { dbPool } from "@/lib/db";
import { genreSlug } from "@/lib/stories";
import { CHAPTER_NUMBER_SQL, checkPoster, cleanText, notifyReply, STORY_TENANT, UUID } from "@/lib/content";
import { msg, type Msg } from "@/lib/i18n";

export const COMMENTS_PAGE_SIZE = 20;
export const MAX_COMMENT_CHARS = 1000;
const PLATFORM = "Fang";

export type ChapterComment = {
    id: string;
    name: string;
    avatar: string | null;
    content: string;
    createdAt: string;
    likes: number;
    liked: boolean;
    mine: boolean;
    isAuthor: boolean;
    publicId: string | null;
    status: string;
    replies: ChapterComment[];
};

const COMMENT_SELECT = (viewer: string) => `
    SELECT c.id, c.parent_id, c.reader_name, c.reader_avatar, c.is_author, c.content, c.created_at, c.user_id,
           (SELECT count(*)::int FROM comment_likes l WHERE l.comment_id = c.id) AS likes,
           EXISTS (SELECT 1 FROM comment_likes l WHERE l.comment_id = c.id AND l.user_id = ${viewer}) AS liked,
           rp.public_id, COALESCE(u.account_status, 'active') AS account_status
    FROM comments c
    LEFT JOIN users u ON u.id = c.user_id
    LEFT JOIN reader_profiles rp ON rp.user_id = c.user_id`;

function toComment(r: any, viewerId: string | null): ChapterComment {
    return {
        id: r.id,
        name: r.reader_name || "Reader",
        avatar: r.reader_avatar || null,
        content: r.content,
        createdAt: new Date(r.created_at ?? Date.now()).toISOString(),
        likes: Number(r.likes) || 0,
        liked: r.liked === true,
        mine: viewerId != null && r.user_id === viewerId,
        isAuthor: r.is_author === true,
        publicId: r.public_id ?? null,
        status: String(r.account_status).toLowerCase() === "suspended" ? "Suspended" : "Active",
        replies: [],
    };
}

// The chapter, if it's published and its book is visible
async function findChapter(chapterId: string) {
    if (!UUID.test(chapterId)) return null;
    const { rows } = await dbPool.query(
        `SELECT c.id, s.id AS story_id, s.user_id AS writer_id, s.title,
                COALESCE(s.slug, s.book_id, s.id::text) AS slug, COALESCE(s.genre, '') AS genre,
                ${CHAPTER_NUMBER_SQL("c")} AS number
         FROM chapters c JOIN stories s ON s.id = c.story_id
         WHERE c.id = $1 AND c.status = 'published' AND s.is_deleted = false
           AND ($2::text IS NULL OR $2 = ANY(s.tenants))`,
        [chapterId, STORY_TENANT]
    );
    return rows[0] ?? null;
}

// A page of a chapter's comments (newest first), each with its replies (oldest first)
export async function listChapterComments(chapterId: string, viewerId: string | null, before?: string | null) {
    if (!(await findChapter(chapterId))) return null;
    const params: any[] = [chapterId, viewerId];
    let cursor = "";
    if (before && UUID.test(before)) {
        params.push(before);
        cursor = `AND (c.created_at, c.id) < (SELECT created_at, id FROM comments WHERE id = $${params.length})`;
    }
    params.push(COMMENTS_PAGE_SIZE + 1);
    const [{ rows }, { rows: total }] = await Promise.all([
        dbPool.query(
            `${COMMENT_SELECT("$2::uuid")}
             WHERE c.chapter_id = $1 AND c.parent_id IS NULL AND NOT c.blocked ${cursor}
             ORDER BY c.created_at DESC, c.id DESC
             LIMIT $${params.length}`,
            params
        ),
        dbPool.query(
            `SELECT count(*)::int AS n FROM comments c
             WHERE c.chapter_id = $1 AND NOT c.blocked
               AND (c.parent_id IS NULL OR NOT EXISTS (SELECT 1 FROM comments p WHERE p.id = c.parent_id AND p.blocked))`,
            [chapterId]
        ),
    ]);
    const top = rows.slice(0, COMMENTS_PAGE_SIZE).map((r) => toComment(r, viewerId));
    if (top.length) {
        const { rows: replies } = await dbPool.query(
            `${COMMENT_SELECT("$2::uuid")}
             WHERE c.parent_id = ANY($1::uuid[]) AND NOT c.blocked
             ORDER BY c.created_at, c.id`,
            [top.map((c) => c.id), viewerId]
        );
        const byParent = new Map(top.map((c) => [c.id, c]));
        for (const r of replies) byParent.get(r.parent_id)?.replies.push(toComment(r, viewerId));
    }
    return { comments: top, hasMore: rows.length > COMMENTS_PAGE_SIZE, total: Number(total[0]?.n ?? 0) };
}

export type AddResult = { ok: true; comment: ChapterComment; parentId: string | null } | { ok: false; status: number; message: Msg };

export async function addComment(userId: string, chapterId: unknown, contentValue: unknown, parentValue: unknown): Promise<AddResult> {
    const chapter = typeof chapterId === "string" ? await findChapter(chapterId) : null;
    if (!chapter) return { ok: false, status: 404, message: "chapterNotFound" };
    const content = cleanText(contentValue, MAX_COMMENT_CHARS + 1);
    if (!content) return { ok: false, status: 400, message: "writeComment" };
    if (content.length > MAX_COMMENT_CHARS) return { ok: false, status: 400, message: msg("commentMax", { max: MAX_COMMENT_CHARS }) };

    // Replying: always under the top comment of the thread, in the same chapter
    let parent: { id: string; user_id: string | null } | null = null;
    if (parentValue != null && parentValue !== "") {
        if (typeof parentValue !== "string" || !UUID.test(parentValue)) return { ok: false, status: 404, message: "commentNotFound" };
        const { rows } = await dbPool.query(
            `SELECT COALESCE(p.parent_id, p.id) AS id, p.user_id AS reply_to_user
             FROM comments p WHERE p.id = $1 AND p.chapter_id = $2 AND NOT p.blocked`,
            [parentValue, chapter.id]
        );
        if (!rows[0]) return { ok: false, status: 404, message: "commentNotFound" };
        parent = { id: rows[0].id, user_id: rows[0].reply_to_user ?? null };
    }

    const poster = await checkPoster(userId);
    if (!poster.ok) return { ok: false, status: 429, message: poster.message };

    // The book's writer comments under their pen name, like in FangWriters
    const isAuthor = chapter.writer_id === userId;
    let name = poster.name;
    if (isAuthor) {
        const { rows: pen } = await dbPool.query(
            `SELECT COALESCE(NULLIF(trim(pen_name), ''), NULLIF(trim(full_name), '')) AS name
             FROM user_profiles WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [userId]
        );
        if (pen[0]?.name) name = pen[0].name;
    }

    const { rows } = await dbPool.query(
        `INSERT INTO comments (chapter_id, parent_id, reader_name, reader_avatar, is_author, content, platform, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, parent_id, reader_name, reader_avatar, is_author, content, created_at, user_id`,
        [chapter.id, parent?.id ?? null, name, poster.avatar, isAuthor, content, PLATFORM, userId]
    );
    const { rows: me } = await dbPool.query(`SELECT public_id FROM reader_profiles WHERE user_id = $1`, [userId]);
    const comment = toComment({ ...rows[0], likes: 0, liked: false, public_id: me[0]?.public_id ?? null, account_status: "active" }, userId);

    if (parent) {
        await notifyReply(
            parent.user_id,
            userId,
            `comment_reply:${comment.id}`,
            `${name} replied to your comment on “${chapter.title}” Chapter ${chapter.number}`,
            `/stories/${genreSlug(chapter.genre) || "all"}/${chapter.slug}/reader?chapter=${chapter.number}`
        );
    }
    return { ok: true, comment, parentId: parent?.id ?? null };
}

// Only the reader's own comments (replies under it go too)
export async function deleteComment(userId: string, commentId: string) {
    if (!UUID.test(commentId)) return false;
    const { rowCount } = await dbPool.query(`DELETE FROM comments WHERE id = $1 AND user_id = $2`, [commentId, userId]);
    return (rowCount ?? 0) > 0;
}

export type CommentLikeResult = { ok: true; liked: boolean; likes: number } | { ok: false; status: number; message: Msg };

export async function setCommentLike(userId: string, commentId: string, like: boolean): Promise<CommentLikeResult> {
    if (!UUID.test(commentId)) return { ok: false, status: 404, message: "commentNotFound" };
    const { rows } = await dbPool.query(`SELECT user_id FROM comments WHERE id = $1 AND NOT blocked`, [commentId]);
    if (!rows[0]) return { ok: false, status: 404, message: "commentNotFound" };
    if (rows[0].user_id === userId) return { ok: false, status: 400, message: "cantLikeOwnComment" };
    if (like) {
        await dbPool.query(`INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [commentId, userId]);
    } else {
        await dbPool.query(`DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2`, [commentId, userId]);
    }
    const { rows: count } = await dbPool.query(`SELECT count(*)::int AS n FROM comment_likes WHERE comment_id = $1`, [commentId]);
    return { ok: true, liked: like, likes: Number(count[0]?.n ?? 0) };
}

// ---------- My comments ----------

export type MyComment = {
    id: string;
    content: string;
    createdAt: string;
    likes: number;
    replies: number;
    isReply: boolean;
    blocked: boolean;
    book: { title: string; image: string | null; chapter: number; href: string };
};

export async function listMyComments(userId: string, before?: string | null) {
    const params: any[] = [userId];
    let cursor = "";
    if (before && UUID.test(before)) {
        params.push(before);
        cursor = `AND (c.created_at, c.id) < (SELECT created_at, id FROM comments WHERE id = $${params.length} AND user_id = $1)`;
    }
    params.push(COMMENTS_PAGE_SIZE + 1);
    const { rows } = await dbPool.query(
        `SELECT c.id, c.content, c.created_at, c.parent_id, c.blocked,
                (SELECT count(*)::int FROM comment_likes l WHERE l.comment_id = c.id) AS likes,
                (SELECT count(*)::int FROM comments r WHERE r.parent_id = c.id AND NOT r.blocked) AS replies,
                s.title, s.image, COALESCE(s.slug, s.book_id, s.id::text) AS slug, COALESCE(s.genre, '') AS genre,
                ${CHAPTER_NUMBER_SQL("ch")} AS number
         FROM comments c
         JOIN chapters ch ON ch.id = c.chapter_id
         JOIN stories s ON s.id = ch.story_id
         WHERE c.user_id = $1 AND s.is_deleted = false ${cursor}
         ORDER BY c.created_at DESC, c.id DESC
         LIMIT $${params.length}`,
        params
    );
    return {
        comments: rows.slice(0, COMMENTS_PAGE_SIZE).map((r): MyComment => ({
            id: r.id,
            content: r.content,
            createdAt: new Date(r.created_at).toISOString(),
            likes: Number(r.likes) || 0,
            replies: Number(r.replies) || 0,
            isReply: r.parent_id != null,
            blocked: r.blocked === true,
            book: {
                title: r.title,
                image: r.image || null,
                chapter: Number(r.number) || 1,
                href: `/stories/${genreSlug(r.genre) || "all"}/${r.slug}/reader?chapter=${Number(r.number) || 1}`,
            },
        })),
        hasMore: rows.length > COMMENTS_PAGE_SIZE,
    };
}