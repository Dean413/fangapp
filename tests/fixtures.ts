import { dbPool } from "@/lib/db";

export async function makeUser(overrides: Partial<{ email: string; account_status: string }> = {}) {
    const { rows } = await dbPool.query(
        `INSERT INTO users (email, account_status) VALUES ($1, $2) RETURNING id`,
        [overrides.email ?? `user-${Math.random().toString(36).slice(2)}@test.local`, overrides.account_status ?? "active"]
    );
    return rows[0].id as string;
}

export async function makeStory(userId: string, overrides: Partial<{ start_paywall_chapter: number }> = {}) {
    const { rows } = await dbPool.query(
        `INSERT INTO stories (user_id, title, start_paywall_chapter) VALUES ($1, 'Test Story', $2) RETURNING id`,
        [userId, overrides.start_paywall_chapter ?? null]
    );
    return rows[0].id as string;
}

export async function makeChapter(storyId: string, chapterNumber: number, overrides: Partial<{ words: number; status: string }> = {}) {
    const { rows } = await dbPool.query(
        `INSERT INTO chapters (story_id, title, status, words, chapter_number, published_at)
         VALUES ($1, $2, $3, $4, $5, now())
         RETURNING id`,
        [storyId, `Chapter ${chapterNumber}`, overrides.status ?? "published", overrides.words ?? 500, chapterNumber]
    );
    return rows[0].id as string;
}
