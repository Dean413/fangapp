// lib/readerHistory.ts
// The app's History screens (Profile → History):
//   bonus history      every bonus coin lot the reader got: where from, how much, when, when it expires, and its state
//   chapters unlocked  every chapter the reader unlocked, newest first (coins, VIP, ads or free)
//   auto unlock        the books the reader has unlocked chapters in (or has auto-unlock on), with the switch state
/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { dbPool } from "@/lib/db";

const PAGE = 20;
const FALLBACK_COVER = "/fang_pictures/bookFace.png";

// The newest-first cursor: "<exact database time>|<id>" of the last item on the previous page
// (the database's own time text keeps the microseconds, so no entry is skipped or repeated)
function cursor(before: string | null | undefined): { at: string; id: string } | null {
    if (!before) return null;
    const [at, id] = before.split("|");
    if (!at || !id || !/^[0-9: .+\-T]{10,40}$/.test(at) || !/^[0-9a-f-]{1,64}$/i.test(id)) return null;
    return { at, id };
}

// Author's pen name, as on the book pages
const AUTHOR = `LEFT JOIN LATERAL (
        SELECT COALESCE(NULLIF(trim(pen_name), ''), NULLIF(trim(full_name), ''), 'Unknown') AS name
        FROM user_profiles WHERE user_id = s.user_id ORDER BY created_at DESC LIMIT 1
    ) p ON true`;

// ---------- Bonus history ----------

export type BonusLot = {
    id: string;
    source: string;          // signup_bonus, daily_checkin, reading_time, topup_bonus, vip_daily, referral, ad_reward, ...
    refId: string | null;    // e.g. the reading minutes, the check-in day
    amount: number;
    remaining: number;
    receivedAt: string;
    expiresAt: string | null;
    state: "active" | "used" | "expired";
    cursor: string;
};

export async function listBonusLots(userId: string, before?: string | null) {
    const c = cursor(before);
    const params: any[] = [userId, PAGE + 1];
    let after = "";
    if (c) {
        params.push(c.at, c.id);
        after = `AND (w.created_at, w.id) < ($3::timestamptz, $4::bigint)`;
    }
    const [{ rows }, { rows: bal }] = await Promise.all([
        dbPool.query(
            `SELECT w.id::text AS id, w.source, w.amount, w.remaining, w.created_at, w.created_at::text AS at_key, w.expires_at,
                    (SELECT l.ref_id FROM wallet_ledger l WHERE l.lot_id = w.id ORDER BY l.id LIMIT 1) AS ref_id
             FROM wallet_lots w
             WHERE w.user_id = $1 AND w.currency = 'coin' AND w.kind IN ('bonus', 'vip_bonus') ${after}
             ORDER BY w.created_at DESC, w.id DESC
             LIMIT $2`,
            params
        ),
        dbPool.query(
            `SELECT COALESCE(SUM(remaining), 0)::int AS n FROM wallet_lots
             WHERE user_id = $1 AND currency = 'coin' AND kind IN ('bonus', 'vip_bonus')
               AND remaining > 0 AND (expires_at IS NULL OR expires_at > now())`,
            [userId]
        ),
    ]);
    const now = Date.now();
    const lots: BonusLot[] = rows.slice(0, PAGE).map((r: any) => {
        const expiresAt = r.expires_at ? new Date(r.expires_at) : null;
        const expired = !!expiresAt && expiresAt.getTime() <= now && Number(r.remaining) > 0;
        return {
            id: r.id,
            source: r.source,
            refId: r.ref_id ?? null,
            amount: Number(r.amount),
            remaining: Number(r.remaining),
            receivedAt: new Date(r.created_at).toISOString(),
            expiresAt: expiresAt ? expiresAt.toISOString() : null,
            state: expired ? "expired" : Number(r.remaining) === 0 ? "used" : "active",
            cursor: `${r.at_key}|${r.id}`,
        };
    });
    return { balance: Number(bal[0]?.n ?? 0), lots, hasMore: rows.length > PAGE };
}

// ---------- Chapters unlocked ----------

export type UnlockedChapter = {
    book: { slug: string; title: string; author: string; image: string };
    chapterNumber: number | null;
    chapterTitle: string;
    coins: number;
    method: string; // coins | vip | ad | free
    at: string;
    cursor: string;
};

export async function listUnlockedChapters(userId: string, before?: string | null) {
    const c = cursor(before);
    const params: any[] = [userId, PAGE + 1];
    let after = "";
    if (c) {
        params.push(c.at, c.id);
        after = `AND (u.created_at, u.chapter_id) < ($3::timestamptz, $4::uuid)`;
    }
    const { rows } = await dbPool.query(
        `SELECT u.chapter_id::text AS chapter_id, u.coins, u.method, u.created_at, u.created_at::text AS at_key,
                ch.title AS chapter_title, ch.chapter_number,
                COALESCE(s.slug, s.book_id, s.id::text) AS slug, s.title, s.image, p.name AS author
         FROM chapter_unlocks u
         JOIN chapters ch ON ch.id = u.chapter_id
         JOIN stories s ON s.id = u.story_id
         ${AUTHOR}
         WHERE u.user_id = $1 AND s.is_deleted = false ${after}
         ORDER BY u.created_at DESC, u.chapter_id DESC
         LIMIT $2`,
        params
    );
    const items: UnlockedChapter[] = rows.slice(0, PAGE).map((r: any) => ({
        book: { slug: r.slug, title: r.title, author: r.author ?? "Unknown", image: r.image || FALLBACK_COVER },
        chapterNumber: r.chapter_number != null ? Number(r.chapter_number) : null,
        chapterTitle: r.chapter_title ?? "",
        coins: Number(r.coins),
        method: r.method,
        at: new Date(r.created_at).toISOString(),
        cursor: `${r.at_key}|${r.chapter_id}`,
    }));
    return { items, hasMore: rows.length > PAGE };
}

// ---------- Auto unlock ----------

export type AutoUnlockBook = { slug: string; title: string; author: string; image: string; enabled: boolean };

export async function listAutoUnlockBooks(userId: string): Promise<AutoUnlockBook[]> {
    const { rows } = await dbPool.query(
        `WITH mine AS (
             SELECT story_id, MAX(created_at) AS at FROM chapter_unlocks WHERE user_id = $1 GROUP BY story_id
             UNION ALL
             SELECT story_id, created_at FROM reader_auto_unlock WHERE user_id = $1
         ), books AS (
             SELECT story_id, MAX(at) AS at FROM mine GROUP BY story_id
         )
         SELECT COALESCE(s.slug, s.book_id, s.id::text) AS slug, s.title, s.image, p.name AS author,
                EXISTS (SELECT 1 FROM reader_auto_unlock a WHERE a.user_id = $1 AND a.story_id = s.id) AS enabled
         FROM books b
         JOIN stories s ON s.id = b.story_id AND s.is_deleted = false AND s.taken_down_at IS NULL
         ${AUTHOR}
         ORDER BY b.at DESC
         LIMIT 200`,
        [userId]
    );
    return rows.map((r: any) => ({ slug: r.slug, title: r.title, author: r.author ?? "Unknown", image: r.image || FALLBACK_COVER, enabled: r.enabled === true }));
}