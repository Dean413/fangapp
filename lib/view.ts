// lib/views.ts
// Counts a real BOOK view: one per reader per book, ever. Adds 1 to stories.views (the number every screen shows).
import "server-only";
import { dbPool } from "@/lib/db";

export type ViewResult = "counted" | "duplicate" | "ignored";

export async function recordView(args: {
    slug: string;
    userId: string | null;
    anonId: string | null;
}): Promise<ViewResult> {
    const { slug, userId, anonId } = args;
    const viewerKey = userId ? `u:${userId}` : anonId ? `a:${anonId}` : null;
    if (!viewerKey) return "ignored";

    const { rows: found } = await dbPool.query(
        `SELECT id FROM stories WHERE slug = $1 AND COALESCE(is_deleted, false) = false`,
        [slug]
    );
    const story = found[0];
    if (!story) return "ignored";

    // Add the view only if this reader has never viewed this book before, and add 1 to the book's number (one statement)
    const { rows } = await dbPool.query(
        `WITH added AS (
             INSERT INTO story_views (story_id, viewer_key, user_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (story_id, viewer_key) DO NOTHING
             RETURNING 1
         ), bumped AS (
             UPDATE stories SET views = COALESCE(views, 0) + 1
             WHERE id = $1 AND EXISTS (SELECT 1 FROM added)
             RETURNING 1
         )
         SELECT (SELECT count(*) FROM added)::int AS added`,
        [story.id, viewerKey, userId]
    );
    return Number(rows[0]?.added ?? 0) > 0 ? "counted" : "duplicate";
}