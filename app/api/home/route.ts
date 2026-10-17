
import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const { rows } = await dbPool.query(
            `
            SELECT
                cc.id AS collection_id,
                cc.name AS collection_name,
                cc.description AS collection_description,
                cc.display_order AS collection_order,

                ci.id AS curation_item_id,
                ci.position AS book_position,

                CASE
                    WHEN ci.story_id IS NOT NULL THEN 'story'
                    WHEN ci.comic_id IS NOT NULL THEN 'comic'
                    ELSE NULL
                END AS kind,

                COALESCE(s.id, c.id) AS id,
                COALESCE(s.book_id, c.book_id) AS book_id,
                COALESCE(s.title, c.title) AS title,
                COALESCE(s.image, c.cover_image) AS image,
                COALESCE(s.genre, c.genre) AS genre,
                COALESCE(s.language, c.language) AS language,
                COALESCE(s.views, c.views, 0) AS views,
                COALESCE(s.story_status, c.status) AS status,
                COALESCE(s.blurb, c.description) AS blurb,
                COALESCE(s.user_id, c.user_id) AS user_id,

                COALESCE(p.pen_name, p.full_name) AS author

            FROM curation_collections cc

            LEFT JOIN curation_items ci
                ON ci.collection_id = cc.id

            LEFT JOIN stories s
                ON s.id = ci.story_id
                AND COALESCE(s.is_deleted, false) = false

            LEFT JOIN comics c
                ON c.id = ci.comic_id
                AND COALESCE(c.is_deleted, false) = false

            LEFT JOIN LATERAL (
                SELECT
                    up.pen_name,
                    up.full_name
                FROM user_profiles up
                WHERE up.user_id = COALESCE(s.user_id, c.user_id)
                ORDER BY up.created_at DESC
                LIMIT 1
            ) p ON true

            WHERE cc.section = 'home'
                AND cc.tenant = 'fang'
                AND cc.language = 'English'
                AND cc.platform = 'Websites'
                AND cc.enabled = true
                AND (
                    ci.id IS NULL
                    OR s.id IS NOT NULL
                    OR c.id IS NOT NULL
                )

            ORDER BY
                cc.display_order ASC,
                ci.position ASC NULLS LAST,
                ci.id ASC NULLS LAST
            `
        );

        type HomeBook = {
            id: string;
            bookId: string;
            kind: "story" | "comic";
            title: string;
            image: string | null;
            genre: string | null;
            language: string | null;
            views: number;
            status: string | null;
            blurb: string | null;
            author: string | null;
            position: number;
        };

        type HomeCollection = {
            id: number;
            title: string;
            description: string | null;
            displayOrder: number;
            books: HomeBook[];
        };

        const collections = new Map<number, HomeCollection>();

        for (const row of rows) {
            const collectionId = Number(row.collection_id);

            if (!collections.has(collectionId)) {
                collections.set(collectionId, {
                    id: collectionId,
                    title: row.collection_name,
                    description: row.collection_description,
                    displayOrder: Number(row.collection_order),
                    books: [],
                });
            }

            // Keep empty collections too, so the backend remains
            // the source of truth for which sections appear.
            if (!row.id || !row.kind || !row.book_id) {
                continue;
            }

            collections.get(collectionId)!.books.push({
                id: row.id,
                bookId: row.book_id,
                kind: row.kind,
                title: row.title ?? "Untitled",
                image: row.image ?? null,
                genre: row.genre ?? null,
                language: row.language ?? null,
                views: Number(row.views ?? 0),
                status: row.status ?? null,
                blurb: row.blurb ?? null,
                author: row.author ?? null,
                position: Number(row.book_position),
            });
        }

        return NextResponse.json(
            {
                sections: Array.from(collections.values()),
            },
            {
                headers: {
                    "Cache-Control": "no-store",
                },
            }
        );
    } catch (error) {
        console.error("Failed to fetch homepage curation:", error);

        return NextResponse.json(
            { error: "Failed to load homepage collections" },
            { status: 500 }
        );
    }
}
