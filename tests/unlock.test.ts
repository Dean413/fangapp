import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { dbPool } from "@/lib/db";
import { unlockChapter, canReadPaid, priceForWords } from "@/lib/unlock";
import { resetDb } from "./resetDb";
import { makeUser, makeStory, makeChapter } from "./fixtures";

beforeEach(resetDb);
afterAll(() => dbPool.end());

async function giveCoins(userId: string, amount: number) {
    await dbPool.query(
        `INSERT INTO wallet_lots (user_id, currency, kind, amount, remaining, source, net_value_per_coin)
         VALUES ($1, 'coin', 'base', $2, $2, 'test_topup', 0.01)`,
        [userId, amount]
    );
}

describe("unlockChapter", () => {
    it("charges coins and records the unlock for a paid chapter", async () => {
        const reader = await makeUser();
        const writer = await makeUser();
        const story = await makeStory(writer, { start_paywall_chapter: 2 });
        await makeChapter(story, 1, { words: 500 });
        const chapter2 = await makeChapter(story, 2, { words: 500 });
        await giveCoins(reader, 1000);

        const price = priceForWords(500);
        const result = await unlockChapter(reader, story, 2, 2);

        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error("unreachable");
        expect(result.charged).toBe(price);
        expect(result.free).toBe(false);
        expect(result.wallet.coins).toBe(1000 - price);

        const canRead = await canReadPaid(reader, story, chapter2);
        expect(canRead).toBe(true);
    });

    it("is idempotent: unlocking the same chapter twice only charges once", async () => {
        const reader = await makeUser();
        const writer = await makeUser();
        const story = await makeStory(writer, { start_paywall_chapter: 1 });
        await makeChapter(story, 1, { words: 500 });
        await giveCoins(reader, 1000);

        const first = await unlockChapter(reader, story, 1, 1);
        const second = await unlockChapter(reader, story, 1, 1);

        expect(first.ok && first.charged).toBeGreaterThan(0);
        expect(second.ok && second.charged).toBe(0);
    });

    it("refuses to unlock when the reader doesn't have enough coins", async () => {
        const reader = await makeUser();
        const writer = await makeUser();
        const story = await makeStory(writer, { start_paywall_chapter: 1 });
        await makeChapter(story, 1, { words: 500 });
        await giveCoins(reader, 1);

        const result = await unlockChapter(reader, story, 1, 1);

        expect(result.ok).toBe(false);
        if (result.ok) throw new Error("unreachable");
        expect(result.code).toBe("NOT_ENOUGH");

        const canRead = await canReadPaid(reader, story, await dbPool
            .query(`SELECT id FROM chapters WHERE story_id = $1 AND chapter_number = 1`, [story])
            .then((r) => r.rows[0].id));
        expect(canRead).toBe(false);
    });

    it("refuses to unlock earlier locked chapters out of order", async () => {
        const reader = await makeUser();
        const writer = await makeUser();
        const story = await makeStory(writer, { start_paywall_chapter: 1 });
        await makeChapter(story, 1, { words: 500 });
        await makeChapter(story, 2, { words: 500 });
        await giveCoins(reader, 1000);

        const result = await unlockChapter(reader, story, 1, 2);

        expect(result.ok).toBe(false);
        if (result.ok) throw new Error("unreachable");
        expect(result.code).toBe("EARLIER_LOCKED");
        expect(result.firstLocked).toBe(1);
    });

    it("the writer reads their own paid chapters for free", async () => {
        const writer = await makeUser();
        const story = await makeStory(writer, { start_paywall_chapter: 1 });
        await makeChapter(story, 1, { words: 500 });

        const result = await unlockChapter(writer, story, 1, 1);

        expect(result.ok).toBe(false);
        if (result.ok) throw new Error("unreachable");
        expect(result.code).toBe("NOT_PAID");
    });

    it("blocks unlocks for a suspended account", async () => {
        const reader = await makeUser({ account_status: "suspended" });
        const writer = await makeUser();
        const story = await makeStory(writer, { start_paywall_chapter: 1 });
        await makeChapter(story, 1, { words: 500 });
        await giveCoins(reader, 1000);

        const result = await unlockChapter(reader, story, 1, 1);

        expect(result.ok).toBe(false);
        if (result.ok) throw new Error("unreachable");
        expect(result.code).toBe("ACCOUNT");
    });

    it("spends bonus coins before bought coins", async () => {
        const reader = await makeUser();
        const writer = await makeUser();
        const story = await makeStory(writer, { start_paywall_chapter: 1 });
        await makeChapter(story, 1, { words: 500 });
        await giveCoins(reader, 1000); // base
        await dbPool.query(
            `INSERT INTO wallet_lots (user_id, currency, kind, amount, remaining, source)
             VALUES ($1, 'coin', 'bonus', 30, 30, 'test_bonus')`,
            [reader]
        );

        const price = priceForWords(500);
        const result = await unlockChapter(reader, story, 1, 1);

        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error("unreachable");
        // Base coins should be untouched up to the bonus amount; bonus coins spent first.
        expect(result.wallet.bonusCoins).toBe(Math.max(0, 30 - price));
        expect(result.wallet.coins).toBe(1000 - Math.max(0, price - 30));
    });
});
