// lib/notifications.ts
// The reader's notifications. Nothing in the app (or in FangWriters) has to send them: each time the reader
// opens notifications (or the unread count is checked), new ones are filled in from what already exists:
//  - new chapters of books in their library (switch: "New chapters")
//  - coin activity from the wallet: coins received, bought, spent, expired (always on)
//  - bonus coins expiring in the next 24 hours, and today's check-in being ready (switch: "Rewards")
//  - VIP: started, renewed, renewal stopped, ended (always on)
//  - replies (for the community, later)
// Each thing gives at most one notification (unique per kind + ref), so filling in twice never makes duplicates.
// Notifications older than 90 days are cleared.
/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { dbPool } from "@/lib/db";
import { genreSlug } from "@/lib/stories";
import { getCheckinStatus } from "@/lib/reward";

export type NotificationTab = "all" | "unread" | "mentions" | "transactions";
export const NOTIFICATION_TABS: NotificationTab[] = ["all", "unread", "mentions", "transactions"];
export const NOTIFICATIONS_PAGE_SIZE = 20;

const STORY_TENANT = process.env.STORY_TENANT || null;
const SYNC_EVERY_SECONDS = 15;
const LOOK_BACK_DAYS = 14;    // never fill in anything older than this
const FIRST_LOOK_BACK_DAYS = 2; // a reader's very first fill-in: only the last 2 days
const WALLET_PATH = "/profile/wallet";

export type NotificationKind =
    | "new_chapter" | "coins_added" | "coins_spent" | "coins_expired" | "bonus_expiring" | "checkin_ready" | "reply"
    | "vip_started" | "vip_renewed" | "vip_cancelled" | "vip_ended";

export type NotificationItem = {
    id: string;
    kind: NotificationKind;
    at: string;
    read: boolean;
    href: string | null;
    // new_chapter
    author?: string;
    storyTitle?: string;
    chapter?: number;
    // coins_* and bonus_expiring
    amount?: number;
    reason?: string;
    refId?: string | null; // for the description in the reader's language (lib/coinLabels.ts)
    description?: string;
    code?: string;
    expiresAt?: string;
    // checkin_ready
    day?: number;
    coins?: number;
    claimable?: boolean;
    // vip_*
    plan?: "weekly" | "monthly";
    endsAt?: string;
    amountCents?: number;
};

const TAB_SQL: Record<NotificationTab, string> = {
    all: "true",
    unread: "n.read_at IS NULL",
    mentions: "n.kind = 'reply'",
    transactions: "n.kind IN ('coins_added', 'coins_spent', 'coins_expired', 'vip_started', 'vip_renewed')",
};

// ---------- Filling in ----------

// Takes this reader's turn to fill in (at most every 15 seconds; requests at the same moment don't both do it).
// Returns the cut-off time: nothing older than it is filled in.
async function claimSync(userId: string): Promise<Date | null> {
    const { rows } = await dbPool.query(
        `INSERT INTO reader_notification_state (user_id, started_at, synced_at) VALUES ($1, now(), now())
         ON CONFLICT (user_id) DO UPDATE SET synced_at = now()
         WHERE reader_notification_state.synced_at < now() - make_interval(secs => $2)
         RETURNING GREATEST(now() - make_interval(days => $3), started_at - make_interval(days => $4)) AS cutoff`,
        [userId, SYNC_EVERY_SECONDS, LOOK_BACK_DAYS, FIRST_LOOK_BACK_DAYS]
    );
    return rows[0]?.cutoff ?? null;
}

const INSERT = `INSERT INTO reader_notifications (user_id, kind, ref, data, created_at)`;
const SKIP_SEEN = `ON CONFLICT (user_id, kind, ref) DO NOTHING`;

// New published chapters of saved books, published after the book was saved and not read yet
const NEW_CHAPTERS = `
    ${INSERT}
    SELECT $1, 'new_chapter', ch.id::text, jsonb_build_object('storyId', s.id::text, 'chapter', ch.n), ch.at
    FROM reader_library l
    JOIN stories s ON s.id = l.story_id
    LEFT JOIN reading_progress p ON p.user_id = l.user_id AND p.story_id = l.story_id
    JOIN LATERAL (
        SELECT x.id, x.at, x.n FROM (
            SELECT c.id, COALESCE(c.published_at, c.created_at) AS at,
                   COALESCE(c.chapter_number,
                            ROW_NUMBER() OVER (ORDER BY COALESCE(c.published_at, c.created_at), c.created_at, c.id))::int AS n
            FROM chapters c WHERE c.story_id = s.id AND c.status = 'published'
        ) x
        WHERE x.at > GREATEST(l.added_at, $2) AND x.at <= now()
    ) ch ON true
    WHERE l.user_id = $1 AND s.is_deleted = false
      AND ($3::text IS NULL OR $3 = ANY(s.tenants))
      AND ch.n > COALESCE(p.max_chapter, 0)
    ${SKIP_SEEN}`;

// Coin activity. One notification per wallet action: spending across several coin lots is one action.
const COIN_ACTIVITY = `
    ${INSERT}
    SELECT $1, CASE WHEN SUM(l.delta) > 0 THEN 'coins_added' ELSE 'coins_spent' END, MIN(l.tx_code),
           jsonb_build_object('amount', SUM(l.delta), 'reason', l.reason, 'refId', l.ref_id,
                              'bonus', bool_and(l.kind <> 'base')),
           l.created_at
    FROM wallet_ledger l
    WHERE l.user_id = $1 AND l.currency = 'coin' AND l.delta <> 0 AND l.tx_code IS NOT NULL AND l.created_at > $2
    GROUP BY l.reason, l.ref_type, l.ref_id, l.created_at, sign(l.delta)
    ${SKIP_SEEN}`;

// Bonus coins that ran out unused
const COINS_EXPIRED = `
    ${INSERT}
    SELECT $1, 'coins_expired', w.expiry_code,
           jsonb_build_object('amount', -w.remaining, 'reason', 'expired', 'refId', w.source), w.expires_at
    FROM wallet_lots w
    WHERE w.user_id = $1 AND w.currency = 'coin' AND w.remaining > 0 AND w.expiry_code IS NOT NULL
      AND w.expires_at <= now() AND w.expires_at > $2
    ${SKIP_SEEN}`;

// One reminder for all the bonus coins running out in the next 24 hours (a new one once those are gone)
const BONUS_EXPIRING = `
    WITH soon AS (
        SELECT w.id, w.remaining, w.expires_at FROM wallet_lots w
        WHERE w.user_id = $1 AND w.currency = 'coin' AND w.kind IN ('bonus', 'vip_bonus') AND w.remaining > 0
          AND w.expires_at > now() AND w.expires_at <= now() + interval '24 hours'
    )
    ${INSERT}
    SELECT $1, 'bonus_expiring', (SELECT id FROM soon ORDER BY expires_at, id LIMIT 1)::text,
           jsonb_build_object('amount', SUM(remaining), 'expiresAt', MIN(expires_at)), now()
    FROM soon HAVING COUNT(*) > 0
    ${SKIP_SEEN}`;

// VIP paid periods: the first one of a subscription is "started", later ones are "renewed"
const VIP_PAID = `
    ${INSERT}
    SELECT $1,
           CASE WHEN EXISTS (SELECT 1 FROM payments o
                             WHERE o.user_id = p.user_id AND o.provider = p.provider AND o.provider_ref = p.provider_ref
                               AND o.product = 'vip' AND o.status = 'paid' AND o.id < p.id)
                THEN 'vip_renewed' ELSE 'vip_started' END,
           p.id::text,
           jsonb_build_object('plan', p.vip_plan, 'amountCents', p.price_cents,
                              'endsAt', (SELECT v.ends_at FROM vip_subscriptions v WHERE v.external_id = 'payment:' || p.id::text)),
           p.paid_at
    FROM payments p
    WHERE p.user_id = $1 AND p.product = 'vip' AND p.status = 'paid' AND p.paid_at > $2
    ${SKIP_SEEN}`;

// The subscription stopped renewing (the reader cancelled, or the payment provider stopped it)
const VIP_STOPPED = `
    ${INSERT}
    SELECT $1, 'vip_cancelled', b.id::text,
           jsonb_build_object('plan', b.plan, 'endsAt', (SELECT MAX(v.ends_at) FROM vip_subscriptions v WHERE v.user_id = b.user_id)),
           b.cancelled_at
    FROM vip_billing b
    WHERE b.user_id = $1 AND b.status IN ('cancelled', 'ended') AND b.cancelled_at > $2
    ${SKIP_SEEN}`;

// VIP ran out (nothing after it)
const VIP_ENDED = `
    ${INSERT}
    SELECT $1, 'vip_ended', (extract(epoch FROM v.ends_at))::bigint::text, jsonb_build_object('plan', v.plan), v.ends_at
    FROM vip_subscriptions v
    WHERE v.user_id = $1 AND v.ends_at <= now() AND v.ends_at > $2
      AND NOT EXISTS (SELECT 1 FROM vip_subscriptions n WHERE n.user_id = v.user_id AND n.ends_at > v.ends_at)
    ${SKIP_SEEN}`;

// VIP notifications get their own try/catch, so a problem here can never stop the other notifications
async function syncVip(userId: string, cutoff: Date) {
    try {
        await dbPool.query(VIP_PAID, [userId, cutoff]);
        await dbPool.query(VIP_STOPPED, [userId, cutoff]);
        await dbPool.query(VIP_ENDED, [userId, cutoff]);
    } catch (error) {
        console.error("VIP notification sync failed:", error);
    }
}

async function switches(userId: string) {
    const { rows } = await dbPool.query(
        `SELECT notify_new_chapters, notify_rewards FROM reader_settings WHERE user_id = $1`,
        [userId]
    );
    return { newChapters: rows[0]?.notify_new_chapters ?? true, rewards: rows[0]?.notify_rewards ?? true };
}

// The check-in reminder: one per check-in that opens (the ref is the time of the claim before it)
async function checkinReady(userId: string) {
    const status = await getCheckinStatus(userId);
    if (!status.canClaim) return;
    const { rows } = await dbPool.query(`SELECT last_claim_at FROM daily_checkins WHERE user_id = $1`, [userId]);
    const last: Date | null = rows[0]?.last_claim_at ?? null;
    await dbPool.query(
        `${INSERT} VALUES ($1, 'checkin_ready', $2, jsonb_build_object('day', $3::int, 'coins', $4::int),
                           COALESCE($5::timestamptz + interval '24 hours', now()))
         ${SKIP_SEEN}`,
        [userId, last ? String(last.getTime()) : "first", status.nextDay, status.nextCoins, last]
    );
}

function tidyOldRows() {
    if (Math.random() > 0.02) return;
    dbPool
        .query(`DELETE FROM reader_notifications WHERE created_at < now() - interval '90 days'`)
        .catch((error: unknown) => console.error("Notification cleanup failed:", error));
}

// Brings the reader's notifications up to date. Never throws: a failed fill-in only means nothing new shows yet.
export async function syncNotifications(userId: string) {
    try {
        const cutoff = await claimSync(userId);
        if (!cutoff) return;
        tidyOldRows();
        const on = await switches(userId);
        await dbPool.query(COIN_ACTIVITY, [userId, cutoff]);
        await dbPool.query(COINS_EXPIRED, [userId, cutoff]);
        if (on.newChapters) await dbPool.query(NEW_CHAPTERS, [userId, cutoff, STORY_TENANT]);
        if (on.rewards) {
            await dbPool.query(BONUS_EXPIRING, [userId]);
            await checkinReady(userId);
        }
        await syncVip(userId, cutoff);
    } catch (error) {
        console.error("Notification sync failed:", error);
    }
}

// ---------- Reading ----------

function describeCoins(reason: string, refId: string | null): string {
    switch (reason) {
        case "signup_bonus": return "Sign-up bonus";
        case "daily_checkin": return refId ? `Daily check-in · Day ${refId}` : "Daily check-in";
        case "reading_time": return refId ? `Reading reward · ${refId} minutes` : "Reading reward";
        case "purchase":
        case "topup": return "Coins top up";
        case "unlock": return "Chapter unlock";
        case "vip": return "VIP subscription";
        case "expired":
            return refId === "signup_bonus" ? "Sign-up bonus" : refId === "daily_checkin" ? "Daily check-in" : refId === "reading_time" ? "Reading reward" : "Bonus coins";
        default: return reason.replace(/_/g, " ");
    }
}

function toItem(r: any, checkinRef: string | null): NotificationItem {
    const d = r.data ?? {};
    const base = {
        id: String(r.id),
        kind: r.kind as NotificationKind,
        at: new Date(r.created_at).toISOString(),
        read: r.read_at != null,
        href: null as string | null,
    };
    switch (r.kind) {
        case "new_chapter": {
            const chapter = Number(d.chapter) || 1;
            return {
                ...base,
                author: r.author ?? "Unknown",
                storyTitle: r.story_title,
                chapter,
                href: `/stories/${genreSlug(r.genre) || "all"}/${r.slug}/reader?chapter=${chapter}`,
            };
        }
        case "coins_added":
        case "coins_spent":
        case "coins_expired":
            return {
                ...base,
                amount: Number(d.amount) || 0,
                reason: d.reason,
                description: describeCoins(d.reason, d.refId ?? null),
                refId: d.refId ?? null,
                code: r.ref,
                href: `/profile/transaction-history/${r.ref}`,
            };
        case "vip_started":
        case "vip_renewed":
        case "vip_cancelled":
        case "vip_ended":
            return {
                ...base,
                plan: d.plan === "monthly" ? "monthly" : "weekly",
                endsAt: d.endsAt ? new Date(d.endsAt).toISOString() : undefined,
                amountCents: d.amountCents != null ? Number(d.amountCents) : undefined,
                href: WALLET_PATH, // change to your VIP page path if it is different
            };
        case "bonus_expiring":
            return { ...base, amount: Number(d.amount) || 0, expiresAt: d.expiresAt ? new Date(d.expiresAt).toISOString() : undefined, href: WALLET_PATH };
        case "checkin_ready":
            return { ...base, day: Number(d.day) || 1, coins: Number(d.coins) || 0, claimable: checkinRef === r.ref, href: WALLET_PATH };
        default:
            return { ...base, description: typeof d.text === "string" ? d.text : "", href: typeof d.href === "string" ? d.href : null };
    }
}

// The ref of the check-in that's claimable right now (so only that reminder shows "Claim")
async function currentCheckinRef(userId: string): Promise<string | null> {
    const status = await getCheckinStatus(userId);
    if (!status.canClaim) return null;
    const { rows } = await dbPool.query(`SELECT last_claim_at FROM daily_checkins WHERE user_id = $1`, [userId]);
    return rows[0]?.last_claim_at ? String(new Date(rows[0].last_claim_at).getTime()) : "first";
}

// A page of notifications, newest first. `before` = the last id of the previous page.
export async function listNotifications(userId: string, tab: NotificationTab, before?: string | null) {
    const params: any[] = [userId];
    let cursor = "";
    if (before && /^\d{1,18}$/.test(before)) {
        params.push(before);
        cursor = `AND (n.created_at, n.id) < (SELECT created_at, id FROM reader_notifications WHERE id = $${params.length} AND user_id = $1)`;
    }
    params.push(NOTIFICATIONS_PAGE_SIZE + 1);
    const [{ rows }, checkinRef, clock] = await Promise.all([
        dbPool.query(
            `SELECT n.id, n.kind, n.ref, n.data, n.created_at, n.read_at,
                    s.title AS story_title, COALESCE(s.slug, s.book_id, s.id::text) AS slug, COALESCE(s.genre, '') AS genre,
                    a.name AS author
             FROM reader_notifications n
             LEFT JOIN stories s ON n.kind = 'new_chapter' AND s.id::text = n.data->>'storyId'
             LEFT JOIN LATERAL (
                 SELECT COALESCE(NULLIF(trim(pen_name), ''), NULLIF(trim(full_name), ''), 'Unknown') AS name
                 FROM user_profiles WHERE user_id = s.user_id ORDER BY created_at DESC LIMIT 1
             ) a ON n.kind = 'new_chapter'
             WHERE n.user_id = $1
               AND (n.kind <> 'new_chapter' OR (s.id IS NOT NULL AND s.is_deleted = false))
               AND ${TAB_SQL[tab]} ${cursor}
             ORDER BY n.created_at DESC, n.id DESC
             LIMIT $${params.length}`,
            params
        ),
        currentCheckinRef(userId),
        dbPool.query(`SELECT now() AS now`),
    ]);
    const hasMore = rows.length > NOTIFICATIONS_PAGE_SIZE;
    return {
        notifications: rows.slice(0, NOTIFICATIONS_PAGE_SIZE).map((r) => toItem(r, checkinRef)),
        hasMore,
        serverNow: new Date(clock.rows[0].now).toISOString(),
    };
}

export async function unreadCount(userId: string): Promise<number> {
    const { rows } = await dbPool.query(
        `SELECT COUNT(*)::int AS n FROM reader_notifications WHERE user_id = $1 AND read_at IS NULL`,
        [userId]
    );
    return Number(rows[0]?.n ?? 0);
}

// Marks the reader's own notifications as read (at most 200 at a time)
export async function markRead(userId: string, ids: string[]) {
    const clean = [...new Set(ids.filter((id) => typeof id === "string" && /^\d{1,18}$/.test(id)))].slice(0, 200);
    if (clean.length === 0) return 0;
    const { rowCount } = await dbPool.query(
        `UPDATE reader_notifications SET read_at = now() WHERE user_id = $1 AND id = ANY($2::bigint[]) AND read_at IS NULL`,
        [userId, clean]
    );
    return rowCount ?? 0;
}

export async function markAllRead(userId: string) {
    await dbPool.query(`UPDATE reader_notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`, [userId]);
}