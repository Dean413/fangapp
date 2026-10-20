// lib/userActions/review.ts
// Book reviews: 0.5–5 stars (half stars) and text, one per reader per book, editable.
//  - only readers who've reached the book's halfway chapter can review (half its published chapters, rounded up:
//    chapter 20 of 40). Readers who reviewed before keep being able to edit.
//  - the "Enjoying this book? Drop a review" popup: when they finish the halfway chapter and when they finish the
//    last chapter, once each (review_prompts; see reviewPromptAt)
//  - writers can't review their own books
//  - "Review after the novel completion" when the reader had finished a completed book
// Plus likes and replies on reviews. Hidden reviews and replies (by the admin) aren't shown.
/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { dbPool } from "@/lib/db";
import { genreSlug, getStoryBySlug } from "@/lib/stories";
import { canReadPaid } from "@/lib/unlock";
import { checkPoster, cleanText, notifyReply, PERSON_COLUMNS, toPerson, UUID, type Person } from "@/lib/content";

export const REVIEWS_PAGE_SIZE = 10;
export const REPLIES_PAGE_SIZE = 20;
export const MIN_REVIEW_CHARS = 10;
export const MAX_REVIEW_CHARS = 2000;
export const MAX_REPLY_CHARS = 1000;

export type Review = {
    id: string;
    rating: number;
    content: string;
    afterCompletion: boolean;
    createdAt: string;
    updatedAt: string;
    edited: boolean;
    likes: number;
    replies: number;
    liked: boolean;
    mine: boolean;
    author: Person;
};

export type Eligibility = {
    signedIn: boolean;
    canReview: boolean;
    halfway: boolean;      // reached the book's halfway chapter
    ownBook: boolean;
};

export type ReviewSummary = { average: number | null; count: number };

const REVIEW_SELECT = (viewer: string) => `
    SELECT b.id, b.story_id, b.rating, b.content, b.after_completion, b.hidden, b.created_at, b.updated_at, b.user_id,
           (SELECT count(*)::int FROM review_likes l WHERE l.review_id = b.id) AS likes,
           (SELECT count(*)::int FROM review_replies x WHERE x.review_id = b.id AND NOT x.hidden) AS replies,
           EXISTS (SELECT 1 FROM review_likes l WHERE l.review_id = b.id AND l.user_id = ${viewer}) AS liked,
           ${PERSON_COLUMNS("rp", "u")}
    FROM book_reviews b
    JOIN users u ON u.id = b.user_id
    LEFT JOIN reader_profiles rp ON rp.user_id = b.user_id`;

function toReview(r: any, viewerId: string | null): Review {
    const created = new Date(r.created_at);
    const updated = new Date(r.updated_at);
    return {
        id: r.id,
        rating: Number(r.rating),
        content: r.content,
        afterCompletion: r.after_completion === true,
        createdAt: created.toISOString(),
        updatedAt: updated.toISOString(),
        edited: updated.getTime() - created.getTime() > 60000,
        likes: Number(r.likes) || 0,
        replies: Number(r.replies) || 0,
        liked: r.liked === true,
        mine: viewerId != null && r.user_id === viewerId,
        author: toPerson(r),
    };
}

// The rating must be 0.5, 1, 1.5 … 5
export function cleanRating(value: unknown): number | null {
    const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (!Number.isFinite(n) || n < 0.5 || n > 5 || Math.round(n * 2) !== n * 2) return null;
    return n;
}

// The book's halfway chapter: half its published chapters, rounded up (20 of 40, 8 of 15)
const halfwayChapter = (lastNumber: number) => Math.max(1, Math.ceil(lastNumber / 2));

// Whether the reader may review the book (reached its halfway chapter, not their own book), and whether they finished it.
// reading_progress.max_chapter only counts chapters the reader could read (paid ones once unlocked).
async function readingState(storyId: string, userId: string) {
    const { rows } = await dbPool.query(
        `SELECT s.user_id = $2 AS own_book,
                lower(COALESCE(s.story_status, '')) AS status,
                COALESCE(p.max_chapter, 0) AS read,
                ch.published, ch.last_number
         FROM stories s
         LEFT JOIN reading_progress p ON p.story_id = s.id AND p.user_id = $2
         LEFT JOIN LATERAL (
             SELECT count(*)::int AS published, COALESCE(max(n), 0)::int AS last_number FROM (
                 SELECT COALESCE(c.chapter_number,
                        ROW_NUMBER() OVER (ORDER BY COALESCE(c.published_at, c.created_at), c.created_at, c.id))::int AS n
                 FROM chapters c WHERE c.story_id = s.id AND c.status = 'published'
             ) numbered
         ) ch ON true
         WHERE s.id = $1`,
        [storyId, userId]
    );
    const r = rows[0];
    if (!r) return null;
    const published = Number(r.published) || 0;
    const read = Number(r.read) || 0;
    const lastNumber = Number(r.last_number) || 0;
    const halfway = lastNumber > 0 && read >= halfwayChapter(lastNumber);
    return {
        ownBook: r.own_book === true,
        halfway,
        canReview: published > 0 && halfway && r.own_book !== true,
        finished: r.status === "completed" && read >= Number(r.last_number) && Number(r.last_number) > 0,
    };
}

export async function getEligibility(storyId: string, userId: string | null): Promise<Eligibility> {
    if (!userId) return { signedIn: false, canReview: false, halfway: false, ownBook: false };
    const state = await readingState(storyId, userId);
    if (!state) return { signedIn: true, canReview: false, halfway: false, ownBook: false };
    return { signedIn: true, canReview: state.canReview, halfway: state.halfway, ownBook: state.ownBook };
}

export type PromptResult = { ok: true; show: boolean } | { ok: false; status: number; message: string };

// The reading page reports the reader finished a chapter (scrolled to its end).
// show = open the popup now: when that chapter is the book's halfway chapter or its last chapter, once each per
// account, only for a chapter they can read (free, unlocked or their own book), never for their own book or once
// they've reviewed it. Each showing is claimed in the database, so it happens once (any device, any number of tabs).
export async function reviewPromptAt(userId: string, bookId: string, chapterNumber: number): Promise<PromptResult> {
    if (!Number.isInteger(chapterNumber) || chapterNumber < 1 || chapterNumber > 100000) {
        return { ok: false, status: 400, message: "Invalid chapter" };
    }
    const story = await getStoryBySlug(bookId);
    if (!story) return { ok: false, status: 404, message: "Book not found" };
    const storyId = String(story.id);

    const { rows: found } = await dbPool.query(
        `WITH numbered AS (
             SELECT c.id::text AS id,
                    COALESCE(c.chapter_number,
                             ROW_NUMBER() OVER (ORDER BY COALESCE(c.published_at, c.created_at), c.created_at, c.id))::int AS n
             FROM chapters c WHERE c.story_id = $1 AND c.status = 'published'
         )
         SELECT (SELECT id FROM numbered WHERE n = $2 LIMIT 1) AS id,
                (SELECT COALESCE(max(n), 0)::int FROM numbered) AS last_number`,
        [storyId, chapterNumber]
    );
    const chapterId: string | null = found[0]?.id ?? null;
    const lastNumber = Number(found[0]?.last_number) || 0;
    if (!chapterId) return { ok: false, status: 404, message: "Chapter not found" };

    // Only the halfway chapter and the last chapter (a one-chapter book: just the end)
    const point = chapterNumber === lastNumber ? "end" : chapterNumber === halfwayChapter(lastNumber) ? "half" : null;
    if (!point) return { ok: true, show: false };

    const paywall = story.startPaywallChapter;
    const paid = paywall != null && paywall > 0 && chapterNumber >= paywall;
    if (paid && !(await canReadPaid(userId, storyId, chapterId))) return { ok: true, show: false };

    const state = await readingState(storyId, userId);
    if (!state || state.ownBook || !state.canReview) return { ok: true, show: false };
    if (await getMyReview(storyId, userId)) return { ok: true, show: false };

    // Claim this showing (never twice)
    await dbPool.query(
        `INSERT INTO review_prompts (user_id, story_id, chapter_id) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, story_id) DO NOTHING`,
        [userId, storyId, chapterId]
    );
    const column = point === "half" ? "half_shown_at" : "end_shown_at";
    const { rows: claimed } = await dbPool.query(
        `UPDATE review_prompts SET ${column} = now()
         WHERE user_id = $1 AND story_id = $2 AND ${column} IS NULL
         RETURNING 1`,
        [userId, storyId]
    );
    return { ok: true, show: claimed.length > 0 };
}

export async function getSummary(storyId: string): Promise<ReviewSummary> {
    const { rows } = await dbPool.query(
        `SELECT round(avg(rating), 1) AS average, count(*)::int AS count FROM book_reviews WHERE story_id = $1 AND NOT hidden`,
        [storyId]
    );
    const count = Number(rows[0]?.count ?? 0);
    return { average: count > 0 ? Number(rows[0].average) : null, count };
}

// A page of a book's reviews, newest first. `before` = the last review id of the previous page.
export async function listReviews(storyId: string, viewerId: string | null, before?: string | null) {
    const params: any[] = [storyId, viewerId];
    let cursor = "";
    if (before && UUID.test(before)) {
        params.push(before);
        cursor = `AND (b.created_at, b.id) < (SELECT created_at, id FROM book_reviews WHERE id = $${params.length})`;
    }
    params.push(REVIEWS_PAGE_SIZE + 1);
    const { rows } = await dbPool.query(
        `${REVIEW_SELECT("$2::uuid")}
         WHERE b.story_id = $1 AND NOT b.hidden ${cursor}
         ORDER BY b.created_at DESC, b.id DESC
         LIMIT $${params.length}`,
        params
    );
    return {
        reviews: rows.slice(0, REVIEWS_PAGE_SIZE).map((r) => toReview(r, viewerId)),
        hasMore: rows.length > REVIEWS_PAGE_SIZE,
    };
}

export async function getMyReview(storyId: string, userId: string): Promise<Review | null> {
    const { rows } = await dbPool.query(`${REVIEW_SELECT("$2::uuid")} WHERE b.story_id = $1 AND b.user_id = $2`, [storyId, userId]);
    return rows[0] ? toReview(rows[0], userId) : null;
}

export type SaveResult = { ok: true; review: Review; created: boolean } | { ok: false; status: number; message: string };

// Writes or updates the reader's review of a book
export async function saveReview(userId: string, bookId: string, ratingValue: unknown, contentValue: unknown): Promise<SaveResult> {
    const rating = cleanRating(ratingValue);
    if (rating === null) return { ok: false, status: 400, message: "Please choose a rating" };
    const content = cleanText(contentValue, MAX_REVIEW_CHARS + 1);
    if (content.length < MIN_REVIEW_CHARS) return { ok: false, status: 400, message: `Please write at least ${MIN_REVIEW_CHARS} characters` };
    if (content.length > MAX_REVIEW_CHARS) return { ok: false, status: 400, message: `Reviews can be at most ${MAX_REVIEW_CHARS} characters` };

    const story = await getStoryBySlug(bookId);
    if (!story) return { ok: false, status: 404, message: "Book not found" };

    const poster = await checkPoster(userId);
    if (!poster.ok) return { ok: false, status: 429, message: poster.message };

    const state = await readingState(String(story.id), userId);
    if (!state) return { ok: false, status: 404, message: "Book not found" };
    if (state.ownBook) return { ok: false, status: 403, message: "You can't review your own book" };
    // Readers who already reviewed (also under the old 3-chapter rule) can always edit their review
    if (!state.canReview && !(await getMyReview(String(story.id), userId))) {
        return { ok: false, status: 403, message: "Read at least half of a chapter to review this book" };
    }

    const { rows } = await dbPool.query(
        `INSERT INTO book_reviews (story_id, user_id, rating, content, after_completion)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (story_id, user_id) DO UPDATE SET
             rating = EXCLUDED.rating, content = EXCLUDED.content,
             after_completion = book_reviews.after_completion OR EXCLUDED.after_completion,
             updated_at = now()
         RETURNING id, (xmax = 0) AS created`,
        [story.id, userId, rating, content, state.finished]
    );
    const review = await getMyReview(String(story.id), userId);
    if (!review) return { ok: false, status: 500, message: "Couldn't save your review" };
    return { ok: true, review, created: rows[0]?.created === true };
}

export async function deleteReview(userId: string, reviewId: string) {
    if (!UUID.test(reviewId)) return false;
    const { rowCount } = await dbPool.query(`DELETE FROM book_reviews WHERE id = $1 AND user_id = $2`, [reviewId, userId]);
    return (rowCount ?? 0) > 0;
}

export type LikeResult = { ok: true; liked: boolean; likes: number } | { ok: false; status: number; message: string };

export async function setReviewLike(userId: string, reviewId: string, like: boolean): Promise<LikeResult> {
    if (!UUID.test(reviewId)) return { ok: false, status: 404, message: "Review not found" };
    const { rows } = await dbPool.query(`SELECT user_id FROM book_reviews WHERE id = $1 AND NOT hidden`, [reviewId]);
    if (!rows[0]) return { ok: false, status: 404, message: "Review not found" };
    if (rows[0].user_id === userId) return { ok: false, status: 400, message: "You can't like your own review" };
    if (like) {
        await dbPool.query(`INSERT INTO review_likes (review_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [reviewId, userId]);
    } else {
        await dbPool.query(`DELETE FROM review_likes WHERE review_id = $1 AND user_id = $2`, [reviewId, userId]);
    }
    const { rows: count } = await dbPool.query(`SELECT count(*)::int AS n FROM review_likes WHERE review_id = $1`, [reviewId]);
    return { ok: true, liked: like, likes: Number(count[0]?.n ?? 0) };
}

// ---------- Replies ----------

export type ReviewReply = { id: string; content: string; createdAt: string; mine: boolean; author: Person };

export async function listReplies(reviewId: string, viewerId: string | null, after?: string | null) {
    if (!UUID.test(reviewId)) return { replies: [], hasMore: false };
    const params: any[] = [reviewId];
    let cursor = "";
    if (after && UUID.test(after)) {
        params.push(after);
        cursor = `AND (x.created_at, x.id) > (SELECT created_at, id FROM review_replies WHERE id = $${params.length})`;
    }
    params.push(REPLIES_PAGE_SIZE + 1);
    const { rows } = await dbPool.query(
        `SELECT x.id, x.content, x.created_at, x.user_id, ${PERSON_COLUMNS("rp", "u")}
         FROM review_replies x
         JOIN users u ON u.id = x.user_id
         LEFT JOIN reader_profiles rp ON rp.user_id = x.user_id
         WHERE x.review_id = $1 AND NOT x.hidden ${cursor}
         ORDER BY x.created_at, x.id
         LIMIT $${params.length}`,
        params
    );
    return {
        replies: rows.slice(0, REPLIES_PAGE_SIZE).map((r): ReviewReply => ({
            id: r.id,
            content: r.content,
            createdAt: new Date(r.created_at).toISOString(),
            mine: viewerId != null && r.user_id === viewerId,
            author: toPerson(r),
        })),
        hasMore: rows.length > REPLIES_PAGE_SIZE,
    };
}

export type ReplyResult = { ok: true; reply: ReviewReply } | { ok: false; status: number; message: string };

export async function addReply(userId: string, reviewId: string, contentValue: unknown): Promise<ReplyResult> {
    if (!UUID.test(reviewId)) return { ok: false, status: 404, message: "Review not found" };
    const content = cleanText(contentValue, MAX_REPLY_CHARS + 1);
    if (!content) return { ok: false, status: 400, message: "Please write a reply" };
    if (content.length > MAX_REPLY_CHARS) return { ok: false, status: 400, message: `Replies can be at most ${MAX_REPLY_CHARS} characters` };

    const poster = await checkPoster(userId);
    if (!poster.ok) return { ok: false, status: 429, message: poster.message };

    const { rows: target } = await dbPool.query(
        `SELECT b.user_id, s.title, COALESCE(s.slug, s.book_id, s.id::text) AS slug, COALESCE(s.genre, '') AS genre
         FROM book_reviews b JOIN stories s ON s.id = b.story_id
         WHERE b.id = $1 AND NOT b.hidden AND s.is_deleted = false`,
        [reviewId]
    );
    if (!target[0]) return { ok: false, status: 404, message: "Review not found" };

    const { rows } = await dbPool.query(
        `INSERT INTO review_replies (review_id, user_id, content) VALUES ($1, $2, $3) RETURNING id, created_at`,
        [reviewId, userId, content]
    );
    const t = target[0];
    await notifyReply(
        t.user_id,
        userId,
        `review_reply:${rows[0].id}`,
        `${poster.name} replied to your review of “${t.title}”`,
        `/stories/${genreSlug(t.genre) || "all"}/${t.slug}#reviews`
    );
    const { rows: me } = await dbPool.query(
        `SELECT ${PERSON_COLUMNS("rp", "u")} FROM users u LEFT JOIN reader_profiles rp ON rp.user_id = u.id WHERE u.id = $1`,
        [userId]
    );
    return {
        ok: true,
        reply: { id: rows[0].id, content, createdAt: new Date(rows[0].created_at).toISOString(), mine: true, author: toPerson(me[0] ?? {}) },
    };
}

export async function deleteReply(userId: string, replyId: string) {
    if (!UUID.test(replyId)) return false;
    const { rowCount } = await dbPool.query(`DELETE FROM review_replies WHERE id = $1 AND user_id = $2`, [replyId, userId]);
    return (rowCount ?? 0) > 0;
}

// ---------- My reviews ----------

export type MyReview = Review & { hidden: boolean; book: { title: string; author: string; image: string | null; href: string; slug: string } };

export async function listMyReviews(userId: string, before?: string | null) {
    const params: any[] = [userId];
    let cursor = "";
    if (before && UUID.test(before)) {
        params.push(before);
        cursor = `AND (b.created_at, b.id) < (SELECT created_at, id FROM book_reviews WHERE id = $${params.length} AND user_id = $1)`;
    }
    params.push(REVIEWS_PAGE_SIZE + 1);
    const { rows } = await dbPool.query(
        `SELECT q.*, s.title AS book_title, s.image AS book_image, COALESCE(s.slug, s.book_id, s.id::text) AS book_slug,
                COALESCE(s.genre, '') AS book_genre, a.name AS book_author
         FROM (${REVIEW_SELECT("$1::uuid")} WHERE b.user_id = $1 ${cursor}) q
         JOIN stories s ON s.id = q.story_id
         LEFT JOIN LATERAL (
             SELECT COALESCE(NULLIF(trim(pen_name), ''), NULLIF(trim(full_name), ''), 'Unknown') AS name
             FROM user_profiles WHERE user_id = s.user_id ORDER BY created_at DESC LIMIT 1
         ) a ON true
         WHERE s.is_deleted = false
         ORDER BY q.created_at DESC, q.id DESC
         LIMIT $${params.length}`,
        params
    );
    return {
        reviews: rows.slice(0, REVIEWS_PAGE_SIZE).map((r): MyReview => ({
            ...toReview(r, userId),
            hidden: r.hidden === true,
            book: {
                title: r.book_title,
                author: r.book_author ?? "Unknown",
                image: r.book_image || null,
                slug: r.book_slug,
                href: `/stories/${genreSlug(r.book_genre) || "all"}/${r.book_slug}`,
            },
        })),
        hasMore: rows.length > REVIEWS_PAGE_SIZE,
    };
}