import type { MetadataRoute } from "next";
import { dbPool } from "@/lib/db";
import { genreSlug, listGenres } from "@/lib/stories";
import { locales, defaultLocale, type Locale } from "@/i18n/routing";

const RAW_SITE = (process.env.SITE_URL || "https://fangapp.io").trim().replace(/\/+$/, "");
// A value without http(s):// (e.g. "fangapp.io" or "localhost:3000") would make new URL() throw
const SITE = /^https?:\/\//i.test(RAW_SITE)
    ? RAW_SITE
    : `${/^(localhost|127\.)/i.test(RAW_SITE) ? "http" : "https"}://${RAW_SITE}`;

// Only list stories distributed to this tenant (matched against stories.tenants). Unset = no filter.
const STORY_TENANT = process.env.STORY_TENANT || null;
const PUBLISHED_CHAPTER_STATUS = "published";

// Public pages that exist under every locale and don't depend on the database
const STATIC_PATHS = [
    "",
    "about",
    "faq",
    "stories",
    "shorties",
    "rankings",
    "community-guidelines",
    "cookie-policy",
    "dmca",
    "privacy-policy",
    "refund-policy",
    "terms-of-service",
];

// localePrefix is "as-needed": the default locale has no prefix, the others are under /<locale>
function localeUrl(locale: Locale, path: string): string {
    const prefix = locale === defaultLocale ? "" : `/${locale}`;
    return `${SITE}${prefix}${path ? `/${path}` : ""}`;
}

function visibility(params: unknown[]): string[] {
    const where = [
        "s.is_deleted = false",
        `EXISTS (SELECT 1 FROM chapters pc WHERE pc.story_id = s.id AND pc.status = '${PUBLISHED_CHAPTER_STATUS}')`,
    ];
    if (STORY_TENANT) {
        params.push(STORY_TENANT);
        where.push(`$${params.length} = ANY(s.tenants)`);
    }
    return where;
}

async function storyPaths(): Promise<{ path: string; lastModified: Date }[]> {
    const params: unknown[] = [];
    const where = [...visibility(params), "s.slug IS NOT NULL"];

    const { rows } = await dbPool.query(
        `SELECT s.slug, s.genre, s.updated_on
         FROM stories s
         WHERE ${where.join(" AND ")}
         ORDER BY s.updated_on DESC
         LIMIT 45000`,
        params
    );
    return rows.map((row) => ({
        path: `stories/${genreSlug(row.genre) || "all"}/${row.slug}`,
        lastModified: row.updated_on ? new Date(row.updated_on) : new Date(),
    }));
}

async function authorPaths(): Promise<{ path: string; lastModified: Date }[]> {
    const params: unknown[] = [];
    const where = [
        ...visibility(params),
        "NULLIF(trim(up.pen_name), '') IS NOT NULL",
        "COALESCE(u.role, '') NOT LIKE 'platform%'",
    ];

    const { rows } = await dbPool.query(
        `SELECT trim(up.pen_name) AS pen_name, MAX(s.updated_on) AS updated_on
         FROM stories s
         JOIN users u ON u.id = s.user_id
         JOIN user_profiles up ON up.user_id = u.id
         WHERE ${where.join(" AND ")}
         GROUP BY trim(up.pen_name)`,
        params
    );
    return rows.map((row) => ({
        path: `authors/${genreSlug(row.pen_name)}`,
        lastModified: row.updated_on ? new Date(row.updated_on) : new Date(),
    }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const [genres, stories, authors] = await Promise.all([listGenres(), storyPaths(), authorPaths()]);

    const entries: MetadataRoute.Sitemap = [];

    for (const locale of locales) {
        for (const path of STATIC_PATHS) {
            entries.push({
                url: localeUrl(locale, path),
                changeFrequency: path === "" ? "daily" : "monthly",
                priority: path === "" ? 1 : 0.6,
            });
        }
        for (const genre of genres) {
            entries.push({ url: localeUrl(locale, `stories/${genre.slug}`), changeFrequency: "daily", priority: 0.7 });
            entries.push({ url: localeUrl(locale, `shorties/${genre.slug}`), changeFrequency: "daily", priority: 0.6 });
        }
    }

    // Book and author pages aren't translated per locale, so list each once under its canonical
    // (default-locale) URL instead of multiplying them by 9 locales — avoids duplicate-content bloat
    // and keeps the sitemap well under Google's 50,000 URL-per-file limit.
    for (const story of stories) {
        entries.push({ url: localeUrl(defaultLocale, story.path), lastModified: story.lastModified, changeFrequency: "weekly", priority: 0.8 });
    }
    for (const author of authors) {
        entries.push({ url: localeUrl(defaultLocale, author.path), lastModified: author.lastModified, changeFrequency: "weekly", priority: 0.5 });
    }

    return entries;
}
