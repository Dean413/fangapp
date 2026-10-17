// lib/readerProfile.ts
// Reading and saving a reader's profile (reader_profiles + reader_favorite_genres).
import "server-only";
import { dbPool } from "@/lib/db";

export type ReaderProfile = {
    public_id: string | null;
    full_name: string;
    username: string | null;
    bio: string | null;
    avatar_url: string | null;
    cover_url: string | null;
    genre_ids: string[];
    joined_at: string | null; // when the reader profile was made
};

export const USERNAME_RULE = /^[A-Za-z0-9_]{3,20}$/;
export const BIO_MAX = 300;
export const MAX_GENRES = 10;

export async function getReaderProfile(userId: string): Promise<ReaderProfile | null> {
    const { rows } = await dbPool.query(
        `SELECT r.public_id, r.full_name, r.username, r.bio, r.avatar_url, r.cover_url, r.created_at,
                COALESCE(ARRAY(SELECT g.option_id::text FROM reader_favorite_genres g WHERE g.user_id = r.user_id ORDER BY g.created_at), '{}') AS genre_ids
         FROM reader_profiles r WHERE r.user_id = $1`,
        [userId]
    );
    const r = rows[0];
    if (!r) return null;
    return {
        public_id: r.public_id ?? null,
        full_name: r.full_name ?? "",
        username: r.username ?? null,
        bio: r.bio ?? null,
        avatar_url: r.avatar_url ?? null,
        cover_url: r.cover_url ?? null,
        genre_ids: Array.isArray(r.genre_ids) ? r.genre_ids : [],
        joined_at: r.created_at ? new Date(r.created_at).toISOString() : null,
    };
}

// The genres readers can pick (the same Primary Genre list as the writers app and the admin)
export async function getGenreOptions(): Promise<{ id: string; name: string }[]> {
    const { rows } = await dbPool.query(
        `SELECT o.id::text AS id, o.name
         FROM metadata_options o JOIN metadata_categories c ON c.id = o.category_id
         WHERE c.slug = 'primary_genre' AND o.enabled
         ORDER BY o.display_order, o.name`
    );
    return rows.map((r) => ({ id: r.id as string, name: r.name as string }));
}