// app/api/library/continue/route.ts
// GET ?limit=4   the signed-in reader's most recently read books they haven't finished, newest first,
//                for the Continue Reading row. { books: [] } when signed out or nothing to continue.
import { NextRequest } from "next/server";
import { dbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { genreSlug } from "@/lib/stories";
import { reply } from "@/lib/auth/rules";

const STORY_TENANT = process.env.STORY_TENANT || null;
const FALLBACK_COVER = "/fang_pictures/bookFace.png";

export async function GET(request: NextRequest) {
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit")) || 4, 1), 12);
    const user = await getCurrentUser();
    if (!user) return noStore(await reply(200, "OK", { books: [] }));

    try {
        const { rows } = await dbPool.query(
            `SELECT COALESCE(s.slug, s.book_id, s.id::text) AS slug, s.title, s.image, COALESCE(s.genre, '') AS genre,
                    COALESCE(s.blurb, '') AS blurb, a.name AS author,
                    p.last_chapter, ch.chapter_count, ch.last_number
             FROM reading_progress p
             JOIN stories s ON s.id = p.story_id
             LEFT JOIN LATERAL (
                 SELECT COUNT(*)::int AS chapter_count, COALESCE(MAX(n), 0)::int AS last_number
                 FROM (
                     SELECT COALESCE(c.chapter_number,
                                     ROW_NUMBER() OVER (ORDER BY COALESCE(c.published_at, c.created_at), c.created_at, c.id))::int AS n
                     FROM chapters c WHERE c.story_id = s.id AND c.status = 'published'
                 ) numbered
             ) ch ON true
             LEFT JOIN LATERAL (
                 SELECT COALESCE(NULLIF(trim(pen_name), ''), NULLIF(trim(full_name), ''), 'Unknown') AS name
                 FROM user_profiles WHERE user_id = s.user_id ORDER BY created_at DESC LIMIT 1
             ) a ON true
             WHERE p.user_id = $1
               AND COALESCE(s.is_deleted, false) = false
               AND ch.chapter_count > 0
               AND ($2::text IS NULL OR $2 = ANY(s.tenants))
               -- not a completed book whose last chapter was read
               AND NOT (lower(COALESCE(s.story_status, '')) = 'completed' AND COALESCE(p.max_chapter, 0) >= ch.last_number)
             ORDER BY p.last_read_at DESC
             LIMIT $3`,
            [user.id, STORY_TENANT, limit]
        );

        const books = rows.map((r) => {
            const lastChapter = Math.max(1, Number(r.last_chapter) || 1);
            const total = Math.max(Number(r.last_number) || 0, Number(r.chapter_count) || 0, lastChapter);
            const genre = genreSlug(r.genre) || "all";
            return {
                slug: r.slug,
                title: r.title,
                author: r.author ?? "Unknown",
                image: r.image || FALLBACK_COVER,
                blurb: r.blurb,
                lastChapter,
                totalChapters: total,
                href: `/stories/${genre}/${r.slug}/reader?chapter=${lastChapter}`,
            };
        });
        return noStore(await reply(200, "OK", { books }));
    } catch (error) {
        console.error("Continue reading error:", error);
        return reply(500, "couldntLoadReading");
    }
}

function noStore(response: Response) {
    response.headers.set("Cache-Control", "no-store");
    return response;
}