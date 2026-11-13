// lib/pushCampaigns.ts
// Promo pushes the admin writes: a title, a teaser, an optional picture, and the book it opens.
// Who gets it:
//   all       everyone with the app's notifications on
//   genre     readers who picked that genre as a favourite, or read books in it
//   library   readers who have the book in their library and haven't finished it (needs a book)
//   inactive  readers who haven't opened Fang for `inactive_days` days
// Optionally only phones set to one language. A reader gets at most one promo a day: if they already had one,
// they're skipped for this promo (never sent later). Sent by the push job (lib/push.ts) in batches,
// so a big audience goes out over a few runs.
/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { dbPool } from "@/lib/db";
import { deletePushToken, sendPush, type Push, type ServiceAccount } from "@/lib/push";

const BATCH = 300; // readers per batch
const SITE_URL = (process.env.SITE_URL || "https://fangapp.io").replace(/\/$/, "");

const absolute = (url: string | null) => (!url ? null : /^https?:\/\//.test(url) ? url : `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`);

// The next readers this promo should go to (not handled yet)
async function nextReaders(c: any): Promise<{ user_id: string; tokens: string[] }[]> {
    const where: string[] = [`NOT EXISTS (SELECT 1 FROM push_campaign_sends x WHERE x.campaign_id = $1 AND x.user_id = t.user_id)`];
    const params: any[] = [c.id];
    if (c.locale) {
        params.push(c.locale);
        where.push(`t.locale = $${params.length}`);
    }
    if (c.audience === "genre") {
        params.push(c.genre_id ?? "");
        const g = `$${params.length}`;
        where.push(`(EXISTS (SELECT 1 FROM reader_favorite_genres f WHERE f.user_id = t.user_id AND f.option_id::text = ${g})
                     OR EXISTS (SELECT 1 FROM reading_progress p JOIN stories s ON s.id = p.story_id
                                JOIN metadata_options o ON o.id::text = ${g}
                                WHERE p.user_id = t.user_id AND lower(trim(s.genre)) = lower(trim(o.name))))`);
    } else if (c.audience === "library") {
        if (!c.story_id) return [];
        params.push(c.story_id);
        const b = `$${params.length}`;
        where.push(`EXISTS (SELECT 1 FROM reader_library l WHERE l.user_id = t.user_id AND l.story_id = ${b})
                    AND COALESCE((SELECT p.max_chapter FROM reading_progress p WHERE p.user_id = t.user_id AND p.story_id = ${b}), 0)
                        < (SELECT COUNT(*) FROM chapters ch WHERE ch.story_id = ${b} AND ch.status = 'published')`);
    } else if (c.audience === "inactive") {
        params.push(Math.max(1, Number(c.inactive_days) || 7));
        where.push(`EXISTS (SELECT 1 FROM users u WHERE u.id = t.user_id
                            AND COALESCE(u.last_active_at, u.created_at) < now() - make_interval(days => $${params.length}))`);
    }
    params.push(BATCH);
    const { rows } = await dbPool.query(
        `SELECT t.user_id, array_agg(t.token) AS tokens
         FROM push_tokens t
         WHERE ${where.join(" AND ")}
         GROUP BY t.user_id
         LIMIT $${params.length}`,
        params
    );
    return rows;
}

// Sends the promos that are due. Stops at `deadline` (ms timestamp); the next run carries on.
export async function sendDueCampaigns(account: ServiceAccount, deadline: number) {
    let sent = 0;
    const { rows: due } = await dbPool.query(
        `UPDATE push_campaigns SET status = 'sending'
         WHERE status IN ('scheduled', 'sending') AND send_at <= now()
         RETURNING *`
    );

    for (const c of due) {
        const { rows: story } = c.story_id
            ? await dbPool.query(`SELECT COALESCE(s.slug, s.book_id, s.id::text) AS slug, s.image FROM stories s WHERE s.id = $1`, [c.story_id])
            : { rows: [] as any[] };
        const push: Push = {
            title: c.title,
            body: c.body,
            image: absolute(c.image_url || story[0]?.image || null),
            channel: "promos",
            data: { kind: "promo", id: String(c.id), ...(story[0]?.slug ? { slug: story[0].slug } : {}) },
        };

        let finished = false;
        while (Date.now() < deadline) {
            const readers = await nextReaders(c);
            if (readers.length === 0) {
                finished = true;
                break;
            }
            for (const reader of readers) {
                if (Date.now() >= deadline) break;
                // Claim this reader for this promo; skipped if they had another promo in the last 24 hours
                const { rows: claim } = await dbPool.query(
                    `INSERT INTO push_campaign_sends (campaign_id, user_id, sent)
                     VALUES ($1, $2, NOT EXISTS (SELECT 1 FROM push_campaign_sends x
                                                 WHERE x.user_id = $2 AND x.sent AND x.created_at > now() - interval '24 hours'))
                     ON CONFLICT (campaign_id, user_id) DO NOTHING
                     RETURNING sent`,
                    [c.id, reader.user_id]
                );
                if (!claim[0]?.sent) continue;
                let delivered = false;
                for (const token of reader.tokens) {
                    if (await sendPush(account, token, push)) delivered = true;
                    else await deletePushToken(token);
                }
                if (delivered) sent++;
            }
        }

        await dbPool.query(
            `UPDATE push_campaigns
             SET sent_count = (SELECT COUNT(*) FROM push_campaign_sends WHERE campaign_id = $1 AND sent),
                 status = CASE WHEN $2 THEN 'sent' ELSE status END,
                 finished_at = CASE WHEN $2 THEN now() ELSE finished_at END
             WHERE id = $1 AND status = 'sending'`,
            [c.id, finished]
        );
        if (Date.now() >= deadline) break;
    }
    return sent;
}