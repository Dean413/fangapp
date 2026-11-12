// lib/push.ts
// Push notifications to the mobile app, sent through Firebase Cloud Messaging (FCM).
// The notifications themselves are the same ones the Notifications page shows (lib/notifications.ts):
// the push job fills them in for every reader who has the app with notifications on, then sends the new
// ones to their phones. Only updates are pushed (new chapters, check-in, expiring coins, VIP ending, replies,
// admin messages), never coin activity. Each notification is pushed at most once (reader_notifications.pushed_at).
// The same job also sends the admin's promo pushes (lib/pushCampaigns.ts).
//
// Settings (.env):
//   FIREBASE_SERVICE_ACCOUNT_FILE   path to the Firebase service account JSON key (keep it out of git), or
//   FIREBASE_SERVICE_ACCOUNT        the same JSON on one line
//   PUSH_CRON_SECRET                the secret the push job is called with (app/api/push/run)
/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { createSign } from "crypto";
import { readFileSync } from "fs";
import { dbPool } from "@/lib/db";
import { syncNotifications } from "@/lib/notifications";
import { translateMsg, msg } from "@/lib/i18n";
import { defaultLocale, locales, type Locale } from "@/i18n/routing";
import { sendDueCampaigns } from "@/lib/pushCampaign";

export const PUSH_KINDS = ["new_chapter", "checkin_ready", "bonus_expiring", "coins_expired", "vip_cancelled", "vip_ended", "reply", "admin_message"];

const MAX_PER_RUN = 3; // at most this many pushes per reader each run (the rest stay on the Notifications page)
const TIME_BUDGET_MS = 50_000; // the whole run; the next run carries on with what's left
const NOTIFY_BUDGET_MS = 35_000; // notifications first, then promos get the rest

// ---------- saving phones ----------

export async function savePushToken(userId: string, token: string, platform: "android" | "ios", locale: string) {
    await dbPool.query(
        `INSERT INTO push_tokens (token, user_id, platform, locale) VALUES ($1, $2, $3, $4)
         ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform,
                                           locale = EXCLUDED.locale, updated_at = now()`,
        [token, userId, platform, locale]
    );
}

export async function deletePushToken(token: string) {
    await dbPool.query(`DELETE FROM push_tokens WHERE token = $1`, [token]);
}

// ---------- talking to Firebase ----------

export type ServiceAccount = { client_email: string; private_key: string; project_id: string };

export function serviceAccount(): ServiceAccount {
    const file = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
    const raw = file ? readFileSync(file, "utf8") : process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("Firebase service account is not set");
    const json = JSON.parse(raw);
    return { client_email: json.client_email, private_key: json.private_key, project_id: json.project_id };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

// OAuth access token for FCM (signed with the service account key, cached ~55 minutes)
async function accessToken(account: ServiceAccount): Promise<string> {
    if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;
    const now = Math.floor(Date.now() / 1000);
    const encode = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
        iss: account.client_email,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
    })}`;
    const signature = createSign("RSA-SHA256").update(unsigned).sign(account.private_key).toString("base64url");
    const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
        cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) throw new Error(`Firebase token: ${data.error_description ?? data.error ?? res.status}`);
    cachedToken = { value: data.access_token, expiresAt: Date.now() + 55 * 60 * 1000 };
    return data.access_token;
}

// The phone's notification categories (Android channels; the app creates them, readers can switch each one off)
export type PushChannel = "chapters" | "rewards" | "account" | "messages" | "promos";

const CHANNEL: Record<string, PushChannel> = {
    new_chapter: "chapters",
    checkin_ready: "rewards",
    bonus_expiring: "rewards",
    coins_expired: "rewards",
    vip_cancelled: "account",
    vip_ended: "account",
    reply: "messages",
    admin_message: "messages",
};

export type Push = { title: string; body: string; data: Record<string, string>; image?: string | null; channel: PushChannel };

// Sends one push to one phone. Returns false when the phone's token no longer works (app removed, etc.)
export async function sendPush(account: ServiceAccount, token: string, push: Push): Promise<boolean> {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${await accessToken(account)}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            message: {
                token,
                notification: { title: push.title, body: push.body, ...(push.image ? { image: push.image } : {}) },
                data: push.data,
                android: { priority: "high", notification: { channel_id: push.channel, color: "#D90404" } },
            },
        }),
        cache: "no-store",
    });
    if (res.ok) return true;
    const error = await res.json().catch(() => null);
    const code = error?.error?.details?.find((d: any) => d.errorCode)?.errorCode ?? error?.error?.status;
    if (res.status === 404 || code === "UNREGISTERED" || code === "INVALID_ARGUMENT") return false;
    console.error("Push failed:", res.status, code);
    return true;
}

// ---------- the words ----------

const toLocale = (value: string): Locale => ((locales as readonly string[]).includes(value) ? (value as Locale) : defaultLocale);

// In the reader's language; falls back to English when a language has no text for it yet
async function say(key: string, locale: Locale, values?: Record<string, string | number>) {
    const text = await translateMsg(msg(key, values), locale);
    return text === key && locale !== defaultLocale ? translateMsg(msg(key, values), defaultLocale) : text;
}

async function describe(row: any, locale: Locale): Promise<Push | null> {
    const push = await words(row, locale);
    return push ? { ...push, channel: CHANNEL[row.kind] ?? "messages" } : null;
}

async function words(row: any, locale: Locale): Promise<Omit<Push, "channel"> | null> {
    const d = row.data ?? {};
    const data: Record<string, string> = { kind: row.kind, id: String(row.id) };
    switch (row.kind) {
        case "new_chapter":
            if (!row.slug) return null;
            return {
                title: row.story_title ?? "Fang",
                body: await say("pushNewChapter", locale, { chapter: Number(d.chapter) || 1 }),
                data: { ...data, slug: row.slug, chapter: String(Number(d.chapter) || 1) },
            };
        case "checkin_ready":
            return {
                title: await say("pushCheckinTitle", locale),
                body: await say("pushCheckinBody", locale, { coins: Number(d.coins) || 0, day: Number(d.day) || 1 }),
                data,
            };
        case "bonus_expiring":
            return { title: await say("pushExpiringTitle", locale), body: await say("pushExpiringBody", locale, { amount: Number(d.amount) || 0 }), data };
        case "coins_expired":
            return { title: await say("pushExpiredTitle", locale), body: await say("pushExpiredBody", locale, { amount: Math.abs(Number(d.amount) || 0) }), data };
        case "vip_cancelled":
            return { title: await say("pushVipCancelledTitle", locale), body: await say("pushVipCancelledBody", locale), data };
        case "vip_ended":
            return { title: await say("pushVipEndedTitle", locale), body: await say("pushVipEndedBody", locale), data };
        case "reply":
            return { title: await say("pushReplyTitle", locale), body: typeof d.text === "string" && d.text ? d.text : await say("pushReplyBody", locale), data };
        case "admin_message":
            if (typeof d.text !== "string" || !d.text) return null;
            return { title: "Fang", body: d.text, data };
        default:
            return null;
    }
}

// ---------- the job ----------

// Fills in and sends new notifications for every reader with the app's notifications on.
// Called every few minutes (app/api/push/run). Two runs at once never send the same notification twice:
// each notification is claimed (pushed_at set) before it's sent.
export async function runPushJob() {
    const started = Date.now();
    const account = serviceAccount();
    let readers = 0;
    let sent = 0;

    // Phones not seen for 60 days are dropped (the app sends its token again every time it opens)
    await dbPool.query(`DELETE FROM push_tokens WHERE updated_at < now() - interval '60 days'`);

    const { rows: users } = await dbPool.query(
        `SELECT user_id, MIN(created_at) AS since,
                json_agg(json_build_object('token', token, 'locale', locale) ORDER BY updated_at DESC) AS phones
         FROM push_tokens GROUP BY user_id ORDER BY MIN(updated_at)`
    );

    for (const user of users) {
        if (Date.now() - started > NOTIFY_BUDGET_MS) break;
        readers++;
        await syncNotifications(user.user_id);

        // Only what's new since the phone was added, from the last day, not read yet
        const { rows } = await dbPool.query(
            `WITH claimed AS (
                 UPDATE reader_notifications n SET pushed_at = now()
                 WHERE n.user_id = $1 AND n.pushed_at IS NULL AND n.read_at IS NULL
                   AND n.kind = ANY($2) AND n.created_at > GREATEST($3::timestamptz, now() - interval '24 hours')
                 RETURNING n.id, n.kind, n.data, n.created_at
             )
             SELECT c.*, s.title AS story_title, s.slug
             FROM claimed c
             LEFT JOIN stories s ON c.kind = 'new_chapter' AND s.id::text = c.data->>'storyId'
             ORDER BY c.created_at DESC
             LIMIT ${MAX_PER_RUN}`,
            [user.user_id, PUSH_KINDS, user.since]
        );
        if (rows.length === 0) continue;

        for (const phone of user.phones as { token: string; locale: string }[]) {
            const locale = toLocale(phone.locale);
            for (const row of rows) {
                const push = await describe(row, locale);
                if (!push) continue;
                const ok = await sendPush(account, phone.token, push);
                if (!ok) {
                    await deletePushToken(phone.token);
                    break;
                }
                sent++;
            }
        }
    }
    // The admin's promo pushes, with the time that's left
    const promos = await sendDueCampaigns(account, started + TIME_BUDGET_MS);
    return { readers, sent, promos };
}