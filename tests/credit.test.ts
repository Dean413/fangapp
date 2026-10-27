import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { dbPool } from "@/lib/db";
import { creditPayment } from "@/lib/payments/credit";
import { getWalletBalance } from "@/lib/wallet";
import { resetDb } from "./resetDb";
import { makeUser } from "./fixtures";

beforeEach(resetDb);
afterAll(() => dbPool.end());

async function makePayment(userId: string, overrides: Partial<{
    product: string; price_cents: number; base_coins: number; bonus_coins: number;
    vip_bonus_coins: number; gems: number; vip_plan: string | null; status: string;
}> = {}) {
    const { rows } = await dbPool.query(
        `INSERT INTO payments (user_id, provider, price_cents, base_coins, bonus_coins, vip_bonus_coins, gems, vip_plan, product, status)
         VALUES ($1, 'stripe', $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
            userId,
            overrides.price_cents ?? 999,
            overrides.base_coins ?? 1000,
            overrides.bonus_coins ?? 150,
            overrides.vip_bonus_coins ?? 0,
            overrides.gems ?? 0,
            overrides.vip_plan ?? null,
            overrides.product ?? "coins",
            overrides.status ?? "pending",
        ]
    );
    return rows[0].id as number;
}

describe("creditPayment", () => {
    it("credits base and bonus coins for a coin top-up", async () => {
        const user = await makeUser();
        const paymentId = await makePayment(user, { price_cents: 999, base_coins: 1000, bonus_coins: 150 });

        const credited = await creditPayment(paymentId, "txn_123");

        expect(credited).toBe(true);
        const wallet = await getWalletBalance(user);
        expect(wallet.coins).toBe(1000);
        expect(wallet.bonusCoins).toBe(150);

        const { rows } = await dbPool.query(`SELECT status, provider_txn FROM payments WHERE id = $1`, [paymentId]);
        expect(rows[0].status).toBe("paid");
        expect(rows[0].provider_txn).toBe("txn_123");
    });

    it("is safe to call twice for the same payment (webhook retries)", async () => {
        const user = await makeUser();
        const paymentId = await makePayment(user, { base_coins: 500, bonus_coins: 0 });

        const first = await creditPayment(paymentId, "txn_a");
        const second = await creditPayment(paymentId, "txn_b");

        expect(first).toBe(true);
        expect(second).toBe(false);
        const wallet = await getWalletBalance(user);
        expect(wallet.coins).toBe(500);
    });

    it("starts a VIP subscription for a VIP payment instead of crediting coins", async () => {
        const user = await makeUser();
        const paymentId = await makePayment(user, { product: "vip", vip_plan: "weekly", base_coins: 0, bonus_coins: 0 });

        const credited = await creditPayment(paymentId, "txn_vip");

        expect(credited).toBe(true);
        const { rows } = await dbPool.query(`SELECT plan FROM vip_subscriptions WHERE user_id = $1`, [user]);
        expect(rows).toHaveLength(1);
        expect(rows[0].plan).toBe("weekly");

        const wallet = await getWalletBalance(user);
        expect(wallet.coins).toBe(0);
    });

    it("queues a second VIP purchase after the one the reader already has", async () => {
        const user = await makeUser();
        const first = await makePayment(user, { product: "vip", vip_plan: "weekly" });
        await creditPayment(first, "txn_1");

        const second = await makePayment(user, { product: "vip", vip_plan: "weekly" });
        await creditPayment(second, "txn_2");

        const { rows } = await dbPool.query(
            `SELECT starts_at, ends_at FROM vip_subscriptions WHERE user_id = $1 ORDER BY starts_at`,
            [user]
        );
        expect(rows).toHaveLength(2);
        expect(new Date(rows[1].starts_at).getTime()).toBe(new Date(rows[0].ends_at).getTime());
    });
});
