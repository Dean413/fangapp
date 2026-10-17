/* eslint-disable @typescript-eslint/no-explicit-any */
import { dbPool } from "@/lib/db";
import { genreSlug } from "@/lib/stories";

/*
 * Rankings come from the admin's Curation → Ranking section:
 *  - rank types (metadata "rank_type" options)  = the tabs (Power Rank, Trending, ...)
 *  - ranking lists (curation_collections, section 'ranking') = the pills under a tab (All, Billionaire, ...)
 *  - each list belongs to one period (daily / weekly / monthly / all round) and holds hand-ordered books
 * Only this app's tenant, the Websites platform and the reader's language are shown.
 * The reader's filters (reading preference, novel type) narrow a list without changing its order.
 */
const READER_TENANT = "fang"; // this app's tenant id in the admin (FangNova: "fangnova", FangVerse: "fangverse")
const PLATFORM = "Websites";
const FALLBACK_COVER = "/fang_pictures/bookFace.png";
const MAX_BOOKS = 100;

export const RANKING_PERIODS = ["daily", "weekly", "monthly", "all_round"] as const;
export type RankingPeriod = (typeof RANKING_PERIODS)[number];

export const AUDIENCES = ["male", "female"] as const;
export type Audience = (typeof AUDIENCES)[number];

export const NOVEL_TYPES = ["long", "short"] as const;
export type NovelType = (typeof NOVEL_TYPES)[number];

export type RankingList = { id: string; name: string };
export type RankType = { id: string; name: string; lists: RankingList[] };

export type RankingFilters = {
    audience?: Audience | null;  // keeps that audience + "General" books
    novelType?: NovelType | null; // long = Long Form (or no length set), short = Short Form
};

function formatViews(views: number | null): string {
    const n = Number(views) || 0;
    if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}m`;
    if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}k`;
    return String(n);
}

// The tabs (every enabled rank type) and, under each, its enabled lists for this language + period
export async function getRankTypes(language: string, period: RankingPeriod): Promise<RankType[]> {
    const [{ rows: types }, { rows: lists }] = await Promise.all([
        dbPool.query(
            `SELECT o.id::text AS id, o.name
             FROM metadata_options o
             JOIN metadata_categories mc ON mc.id = o.category_id
             WHERE mc.slug = 'rank_type' AND o.enabled
             ORDER BY o.display_order, o.name`
        ),
        dbPool.query(
            `SELECT c.id::text AS id, c.name, c.rank_type_id::text AS rank_type_id
             FROM curation_collections c
             WHERE c.section = 'ranking' AND c.enabled
               AND c.tenant = $1 AND c.language = $2 AND c.platform = $3 AND c.period = $4
             ORDER BY c.display_order, c.created_at`,
            [READER_TENANT, language, PLATFORM, period]
        ),
    ]);

    return types.map((t: any) => ({
        id: t.id,
        name: t.name,
        lists: lists.filter((l: any) => l.rank_type_id === t.id).map((l: any) => ({ id: l.id, name: l.name })),
    }));
}

// A ranking list's books in the admin's order (published, not deleted, assigned to this app),
// narrowed by the reader's filters
export async function getRankingBooks(listId: string, filters: RankingFilters = {}) {
    if (!/^\d{1,18}$/.test(listId)) return null;

    const { rows: list } = await dbPool.query(
        `SELECT 1 FROM curation_collections
         WHERE id = $1 AND section = 'ranking' AND enabled AND tenant = $2`,
        [listId, READER_TENANT]
    );
    if (!list[0]) return null;

    const audience = filters.audience && AUDIENCES.includes(filters.audience) ? filters.audience : "";
    const novelType = filters.novelType && NOVEL_TYPES.includes(filters.novelType) ? filters.novelType : "";

    const { rows } = await dbPool.query(
        `SELECT
            s.id,
            COALESCE(s.slug, s.book_id, s.id::text) AS slug,
            s.title,
            p.name AS author,
            COALESCE(s.genre, '') AS genre,
            s.image,
            s.story_status,
            s.views,
            COALESCE(s.blurb, '') AS summary,
            COALESCE(s.tags, '{}') AS tags,
            (SELECT COUNT(*)::int FROM chapters ch WHERE ch.story_id = s.id AND ch.status = 'published') AS chapter_count
         FROM curation_items i
         JOIN stories s ON s.id = i.story_id
         LEFT JOIN LATERAL (
            SELECT COALESCE(NULLIF(trim(pen_name), ''), NULLIF(trim(full_name), ''), 'Unknown') AS name
            FROM user_profiles WHERE user_id = s.user_id ORDER BY created_at DESC LIMIT 1
         ) p ON true
         WHERE i.collection_id = $1
           AND s.is_deleted = false
           AND $2 = ANY(s.tenants)
           AND EXISTS (SELECT 1 FROM chapters pc WHERE pc.story_id = s.id AND pc.status = 'published')
           AND ($3 = '' OR lower(COALESCE(NULLIF(trim(s.target_audience), ''), 'general')) IN ($3, 'general'))
           AND ($4 = ''
                OR ($4 = 'short' AND COALESCE(s.story_length, '') ILIKE 'short%')
                OR ($4 = 'long' AND COALESCE(s.story_length, '') NOT ILIKE 'short%'))
         ORDER BY i.position, i.created_at
         LIMIT ${MAX_BOOKS}`,
        [listId, READER_TENANT, audience, novelType]
    );

    return rows.map((row: any) => {
        const genre = row.genre || "";
        return {
            id: row.id,
            slug: row.slug,
            title: row.title,
            author: row.author ?? "Unknown",
            genre,
            genreSlug: genreSlug(genre) || "all",
            image: row.image || FALLBACK_COVER,
            status: (row.story_status || "ongoing").toUpperCase(),
            views: formatViews(row.views),
            summary: row.summary,
            tags: row.tags ?? [],
            chapter: row.chapter_count,
        };
    });
}