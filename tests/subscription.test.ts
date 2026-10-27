import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { dbPool } from "@/lib/db";
import { creditVipPeriod } from "@/lib/payments/subscription";
import { resetDb } from "./resetDb";
import { makeUser } from "./fixtures";

beforeEach(resetDb);
afterAll(() => dbPool.end());

async function makeBilling(userId: string, overrides: Partial<{ plan: string; subscriptionId: string; status: string }> = {}) {
    const { rows } = await dbPool.query(
        `INSERT INTO vip_billing (user_id, provider, plan, provider_subscription_id, status)
         VALUES ($1, 'stripe', $2, $3, $4) RETURNING id`,
        [userId, overrides.plan ?? "weekly", overrides.subscriptionId ?? "sub_1", overrides.status ?? "pending"]
    );
    return rows[0].id as number;
}

describe("creditVipPeriod", () => {
    it("credits a VIP period and activates billing for a known subscription", async () => {
        const user = await makeUser();
        await makeBilling(user, { plan: "weekly", subscriptionId: "sub_1" });

        const result = await creditVipPeriod({
            provider: "stripe",
            subscriptionId: "sub_1",
            txnId: "txn_1",
            amountCents: 999,
            currency: "usd",
        });

        expect(result).toBe("credited");
        const { rows: subs } = await dbPool.query(`SELECT plan FROM vip_subscriptions WHERE user_id = $1`, [user]);
        expect(subs).toHaveLength(1);
        const { rows: billing } = await dbPool.query(`SELECT status FROM vip_billing WHERE user_id = $1`, [user]);
        expect(billing[0].status).toBe("active");
    });

    it("ignores a charge for an unknown subscription", async () => {
        const result = await creditVipPeriod({
            provider: "stripe",
            subscriptionId: "sub_unknown",
            txnId: "txn_1",
            amountCents: 999,
            currency: "usd",
        });
        expect(result).toBe("ignored");
    });

    it("ignores a charge whose amount doesn't match the plan price", async () => {
        const user = await makeUser();
        await makeBilling(user, { plan: "weekly", subscriptionId: "sub_1" });

        const result = await creditVipPeriod({
            provider: "stripe",
            subscriptionId: "sub_1",
            txnId: "txn_1",
            amountCents: 1,
            currency: "usd",
        });

        expect(result).toBe("ignored");
        const { rows } = await dbPool.query(`SELECT 1 FROM vip_subscriptions WHERE user_id = $1`, [user]);
        expect(rows).toHaveLength(0);
    });

    it("treats the same charge arriving under a second id as a duplicate", async () => {
        const user = await makeUser();
        await makeBilling(user, { plan: "weekly", subscriptionId: "sub_1" });

        const first = await creditVipPeriod({
            provider: "stripe", subscriptionId: "sub_1", txnId: "txn_1", amountCents: 999, currency: "usd",
        });
        // Same provider_ref (subscription id), different txnId — simulates return-page + webhook double delivery.
        const second = await creditVipPeriod({
            provider: "stripe", subscriptionId: "sub_1", txnId: "txn_2", amountCents: 999, currency: "usd",
        });

        expect(first).toBe("credited");
        expect(second).toBe("duplicate");
        const { rows } = await dbPool.query(`SELECT 1 FROM vip_subscriptions WHERE user_id = $1`, [user]);
        expect(rows).toHaveLength(1);
    });
});
