// lib/content.ts
// Shared by reviews, review replies, chapter comments and reports: who may post, how fast,
// the name and photo shown, and the "someone replied to you" notification.
/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { dbPool } from "@/lib/db";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const STORY_TENANT = process.env.STORY_TENANT || null;

// How a person is shown: username, else their name, else "Reader"
export const PERSON_COLUMNS = (p: string, u: string) => `
    COALESCE(NULLIF(trim(${p}.username), ''), NULLIF(trim(${p}.full_name), ''), 'Reader') AS person_name,
    ${p}.avatar_url AS person_avatar,
    ${p}.public_id AS person_public_id,
    COALESCE(${u}.account_status, 'active') AS person_status`;

export type Person = { name: string; avatar: string | null; publicId: string | null; status: string };

export const toPerson = (r: any): Person => ({
    name: r.person_name ?? "Reader",
    avatar: r.person_avatar ?? null,
    publicId: r.person_public_id ?? null,
    status: String(r.person_status ?? "active").toLowerCase() === "suspended" ? "Suspended" : "Active",
});

// Text from a form: trimmed, at most `max` characters, at most 3 blank lines in a row
export function cleanText(value: unknown, max: number): string {
    if (typeof value !== "string") return "";
    return value.replace(/\r\n?/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim().slice(0, max);
}

export type PostCheck = { ok: true; name: string; avatar: string | null } | { ok: false; message: string };

// Signed-in readers whose account is active may post. Also at most 5 posts a minute and 200 a day
// (reviews, replies and comments together), so nobody can flood a book.
export async function checkPoster(userId: string): Promise<PostCheck> {
    const { rows } = await dbPool.query(
        `SELECT COALESCE(u.account_status, 'active') AS status,
                COALESCE(NULLIF(trim(r.username), ''), NULLIF(trim(r.full_name), ''), 'Reader') AS name,
                r.avatar_url,
                (SELECT count(*) FROM (
                     SELECT created_at FROM book_reviews WHERE user_id = u.id AND updated_at > now() - interval '1 minute'
                     UNION ALL SELECT created_at FROM review_replies WHERE user_id = u.id AND created_at > now() - interval '1 minute'
                     UNION ALL SELECT created_at FROM comments WHERE user_id = u.id AND created_at > now() - interval '1 minute'
                 ) m)::int AS last_minute,
                (SELECT count(*) FROM (
                     SELECT created_at FROM review_replies WHERE user_id = u.id AND created_at > now() - interval '1 day'
                     UNION ALL SELECT created_at FROM comments WHERE user_id = u.id AND created_at > now() - interval '1 day'
                 ) d)::int AS last_day
         FROM users u LEFT JOIN reader_profiles r ON r.user_id = u.id
         WHERE u.id = $1`,
        [userId]
    );
    const r = rows[0];
    if (!r) return { ok: false, message: "Please sign in first" };
    if (r.status !== "active") return { ok: false, message: "Your account can't post right now. Contact support@fangwriters.com." };
    if (r.last_minute >= 5) return { ok: false, message: "You're posting too fast. Please wait a minute." };
    if (r.last_day >= 200) return { ok: false, message: "You've reached today's limit. Please try again tomorrow." };
    return { ok: true, name: r.name, avatar: r.avatar_url ?? null };
}

// "X replied to your …" in the person's notifications (Mentions), unless they turned replies off
export async function notifyReply(toUserId: string | null, fromUserId: string, ref: string, text: string, href: string) {
    if (!toUserId || toUserId === fromUserId) return;
    try {
        await dbPool.query(
            `INSERT INTO reader_notifications (user_id, kind, ref, data)
             SELECT $1, 'reply', $2, jsonb_build_object('text', $3::text, 'href', $4::text)
             WHERE COALESCE((SELECT notify_replies FROM reader_settings WHERE user_id = $1), true)
             ON CONFLICT (user_id, kind, ref) DO NOTHING`,
            [toUserId, ref, text, href]
        );
    } catch (error) {
        console.error("Reply notification failed:", error);
    }
}

// The published chapter numbers of a story: the saved number, or the position in publishing order
export const CHAPTER_NUMBER_SQL = (c: string) => `
    COALESCE(${c}.chapter_number, (
        SELECT count(*)::int FROM chapters c2
        WHERE c2.story_id = ${c}.story_id AND c2.status = 'published'
          AND (COALESCE(c2.published_at, c2.created_at), c2.created_at, c2.id)
              <= (COALESCE(${c}.published_at, ${c}.created_at), ${c}.created_at, ${c}.id)
    ))`;