// Authors reported chapters still showing their full text under the "sign in to unlock" / unlock
// card overlay. The overlay itself (components/reader/chapter-content.tsx) only ever receives
// whatever HTML lib/stories.ts's getChapter() hands it as `content` — if the reader is locked out,
// that function is supposed to send only previewHtml()'s ~10% preview, never the full chapter.
// This exercises the real production path (getStoryBySlug's contract-driven paywall, not a literal
// paywall number) for every kind of locked-out reader: signed out, signed in but hasn't paid, and a
// signed-in reader who already unlocked an earlier chapter but not this one.
import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { dbPool } from "@/lib/db";
import { getStoryBySlug, getChapter } from "@/lib/stories";
import { resetDb } from "./resetDb";
import { makeUser, makeStory, makeChapter, makeContract } from "./fixtures";

beforeEach(resetDb);
afterAll(() => dbPool.end());

const LONG_PARAGRAPH = (label: string) => `<p>${label} ${"word ".repeat(80).trim()}</p>`;
// 10 distinct paragraphs so a leak of any paragraph past the first one or two is obvious
const CHAPTER_HTML = Array.from({ length: 10 }, (_, i) => LONG_PARAGRAPH(`PARAGRAPH_${i}_SECRET_MARKER`)).join("");

describe("chapter lock: content sent to a locked-out reader", () => {
    it("an anonymous (signed-out) reader never receives the full chapter text", async () => {
        const writer = await makeUser();
        const story = await makeStory(writer);
        // start_paywall_chapter on the story row itself is NOT read by getStoryBySlug in production;
        // the contract is what actually gates the chapter (see lib/stories.ts PAYWALL_SQL).
        await makeContract(story, writer, 1);
        await makeChapter(story, 1, { words: 800 });
        await dbPool.query(`UPDATE chapters SET content = $1 WHERE story_id = $2`, [CHAPTER_HTML, story]);

        const detail = await getStoryBySlug(story);
        expect(detail?.startPaywallChapter).toBe(1); // sanity: the contract is actually wired up

        const chapter = await getChapter(detail!, 1, null); // viewerId = null: signed out
        expect(chapter?.isLocked).toBe(true);

        // Every paragraph not in the preview must be absent from what's sent to the client
        const leaked = Array.from({ length: 10 }, (_, i) => `PARAGRAPH_${i}_SECRET_MARKER`)
            .filter((marker) => chapter!.content.includes(marker));
        expect(leaked.length).toBeLessThan(3); // ~10% preview: at most the first paragraph or two
        expect(chapter!.content).not.toContain("PARAGRAPH_9_SECRET_MARKER"); // the end of the chapter must never leak
    });

    it("a signed-in reader who hasn't paid gets the same truncated preview, not the full chapter", async () => {
        const writer = await makeUser();
        const reader = await makeUser();
        const story = await makeStory(writer);
        await makeContract(story, writer, 1);
        await makeChapter(story, 1, { words: 800 });
        await dbPool.query(`UPDATE chapters SET content = $1 WHERE story_id = $2`, [CHAPTER_HTML, story]);

        const detail = await getStoryBySlug(story);
        const chapter = await getChapter(detail!, 1, reader);

        expect(chapter?.isLocked).toBe(true);
        expect(chapter!.content).not.toContain("PARAGRAPH_9_SECRET_MARKER");
    });

    it("a reader who unlocked chapter 1 but not chapter 2 still gets a preview for chapter 2", async () => {
        const writer = await makeUser();
        const reader = await makeUser();
        const story = await makeStory(writer);
        await makeContract(story, writer, 1);
        const ch1 = await makeChapter(story, 1, { words: 800 });
        await makeChapter(story, 2, { words: 800 });
        await dbPool.query(`UPDATE chapters SET content = $1 WHERE story_id = $2 AND chapter_number = 2`, [CHAPTER_HTML, story]);
        await dbPool.query(
            `INSERT INTO chapter_unlocks (user_id, chapter_id, story_id, coins, method) VALUES ($1, $2, $3, 25, 'coins')`,
            [reader, ch1, story]
        );

        const detail = await getStoryBySlug(story);
        const chapter2 = await getChapter(detail!, 2, reader);

        expect(chapter2?.isLocked).toBe(true);
        expect(chapter2!.content).not.toContain("PARAGRAPH_9_SECRET_MARKER");
    });
});
