// Fires the same money-code call twice at once to check the FOR UPDATE locking actually
// prevents double-spends/double-credits under real concurrency, not just sequential calls.
import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { dbPool } from "@/lib/db";
import { unlockChapter, priceForWords } from "@/lib/unlock";
import { creditPayment } from "@/lib/payments/credit";
import { creditVipPeriod } from "@/lib/payments/subscription";
import { claimCheckin, CHECKIN_REWARDS } from "@/lib/reward";
import { getWalletBalance } from "@/lib/wallet";
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

describe("concurrency", () => {
    it("unlockChapter: two simultaneous unlocks of the same chapter only charge once", async () => {
        const reader = await makeUser();
        const writer = await makeUser();
        const story = await makeStory(writer, { start_paywall_chapter: 1 });
        await makeChapter(story, 1, { words: 500 });
        const price = priceForWords(500);
        await giveCoins(reader, price); // exactly enough for ONE unlock, not two

        const [a, b] = await Promise.all([
            unlockChapter(reader, story, 1, 1),
            unlockChapter(reader, story, 1, 1),
        ]);

        const charges = [a, b].filter((r) => r.ok).map((r) => (r as any).charged);
        expect(charges.sort()).toEqual([0, price].sort());

        const wallet = await getWalletBalance(reader);
        expect(wallet.coins).toBe(0); // charged exactly once, not twice, not zero

        const { rows } = await dbPool.query(`SELECT count(*) FROM chapter_unlocks WHERE user_id = $1`, [reader]);
        expect(Number(rows[0].count)).toBe(1);
    });

    it("creditPayment: two simultaneous webhook deliveries for the same payment only credit once", async () => {
        const user = await makeUser();
        const { rows } = await dbPool.query(
            `INSERT INTO payments (user_id, provider, price_cents, base_coins, bonus_coins, status)
             VALUES ($1, 'stripe', 999, 1000, 0, 'pending') RETURNING id`,
            [user]
        );
        const paymentId = rows[0].id as number;

        const [a, b] = await Promise.all([
            creditPayment(paymentId, "txn_a"),
            creditPayment(paymentId, "txn_b"),
        ]);

        expect([a, b].sort()).toEqual([false, true].sort());
        const wallet = await getWalletBalance(user);
        expect(wallet.coins).toBe(1000); // credited exactly once

        const { rows: lots } = await dbPool.query(`SELECT count(*) FROM wallet_lots WHERE user_id = $1`, [user]);
        expect(Number(lots[0].count)).toBe(1);
    });

    it("creditVipPeriod: the same renewal arriving twice at once (webhook + return page) only credits once", async () => {
        const user = await makeUser();
        await dbPool.query(
            `INSERT INTO vip_billing (user_id, provider, plan, provider_subscription_id, status)
             VALUES ($1, 'stripe', 'weekly', 'sub_race', 'pending')`,
            [user]
        );

        const [a, b] = await Promise.all([
            creditVipPeriod({ provider: "stripe", subscriptionId: "sub_race", txnId: "txn_webhook", amountCents: 999, currency: "usd" }),
            creditVipPeriod({ provider: "stripe", subscriptionId: "sub_race", txnId: "txn_return_page", amountCents: 999, currency: "usd" }),
        ]);

        expect([a, b].sort()).toEqual(["credited", "duplicate"].sort());
        const { rows } = await dbPool.query(`SELECT count(*) FROM vip_subscriptions WHERE user_id = $1`, [user]);
        expect(Number(rows[0].count)).toBe(1); // one period granted, not two
    });

    it("claimCheckin: two simultaneous taps of the check-in button only claim once", async () => {
        const user = await makeUser();

        const [a, b] = await Promise.all([claimCheckin(user), claimCheckin(user)]);

        const oks = [a, b].filter((r) => r.ok);
        expect(oks).toHaveLength(1); // exactly one claim went through
        expect((oks[0] as any).day).toBe(1);
        expect((oks[0] as any).coins).toBe(CHECKIN_REWARDS[0]);

        const { rows } = await dbPool.query(`SELECT streak_day FROM daily_checkins WHERE user_id = $1`, [user]);
        expect(rows).toHaveLength(1);
        expect(rows[0].streak_day).toBe(1);

        const wallet = await getWalletBalance(user);
        expect(wallet.bonusCoins).toBe(CHECKIN_REWARDS[0]); // credited exactly once, not twice

        const { rows: lots } = await dbPool.query(`SELECT count(*) FROM wallet_lots WHERE user_id = $1`, [user]);
        expect(Number(lots[0].count)).toBe(1);
    });
});
