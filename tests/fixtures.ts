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

// A signed contract: in production, lib/stories.ts reads the paywall start chapter from here,
// not from a story column (stories.start_paywall_chapter is only a convenience used by test fixtures
// that call unlockChapter directly with a literal paywall number).
export async function makeContract(storyId: string, userId: string, startPaywallChapter: number, overrides: Partial<{ status: string }> = {}) {
    const { rows } = await dbPool.query(
        `INSERT INTO contracts (
            story_id, user_id, plan_id, status, start_paywall_chapter, outline, interesting, main_characters,
            city, legal_name, pen_name, email, gender, dob, nationality, phone_country, phone_number,
            id_number, id_validity, id_type, id_document_front_url, e_signature_url
         ) VALUES (
            $1, $2, 'non-exclusive', $3, $4, 'outline', 'interesting', 'main characters',
            'City', 'Legal Name', 'Pen Name', 'contract@test.local', 'other', '1990-01-01', 'Nowhere', '1', '5550000',
            'ID123', 'Long-Term Valid', 'National ID', 'https://example.com/id.png', 'https://example.com/sig.png'
         ) RETURNING id`,
        [storyId, userId, overrides.status ?? "signed", startPaywallChapter]
    );
    return rows[0].id as string;
}
