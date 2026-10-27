import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { dbPool } from "@/lib/db";
import { claimCheckin, CHECKIN_REWARDS, CHECKIN_GEMS } from "@/lib/reward";
import { getWalletBalance } from "@/lib/wallet";
import { resetDb } from "./resetDb";
import { makeUser } from "./fixtures";

beforeEach(resetDb);
afterAll(() => dbPool.end());

describe("claimCheckin", () => {
    it("gives day 1 coins on the first ever claim", async () => {
        const user = await makeUser();
        const result = await claimCheckin(user);

        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error("unreachable");
        expect(result.day).toBe(1);
        expect(result.coins).toBe(CHECKIN_REWARDS[0]);

        const wallet = await getWalletBalance(user);
        expect(wallet.bonusCoins).toBe(CHECKIN_REWARDS[0]);
    });

    it("refuses a second claim within 24 hours", async () => {
        const user = await makeUser();
        await claimCheckin(user);
        const second = await claimCheckin(user);

        expect(second.ok).toBe(false);
        const wallet = await getWalletBalance(user);
        expect(wallet.bonusCoins).toBe(CHECKIN_REWARDS[0]);
    });

    it("advances to day 2 once 24 hours have passed", async () => {
        const user = await makeUser();
        await claimCheckin(user);
        await dbPool.query(`UPDATE daily_checkins SET last_claim_at = now() - interval '25 hours' WHERE user_id = $1`, [user]);

        const result = await claimCheckin(user);

        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error("unreachable");
        expect(result.day).toBe(2);
        expect(result.coins).toBe(CHECKIN_REWARDS[1]);
    });

    it("resets to day 1 after missing more than 48 hours", async () => {
        const user = await makeUser();
        await claimCheckin(user);
        await dbPool.query(`UPDATE daily_checkins SET streak_day = 4, last_claim_at = now() - interval '49 hours' WHERE user_id = $1`, [user]);

        const result = await claimCheckin(user);

        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error("unreachable");
        expect(result.day).toBe(1);
    });

    it("loops back to day 1 after day 7, and grants the day-7 gem bonus", async () => {
        const user = await makeUser();
        await claimCheckin(user);
        await dbPool.query(`UPDATE daily_checkins SET streak_day = 6, last_claim_at = now() - interval '25 hours' WHERE user_id = $1`, [user]);

        const day7 = await claimCheckin(user);
        expect(day7.ok).toBe(true);
        if (!day7.ok) throw new Error("unreachable");
        expect(day7.day).toBe(7);
        expect(day7.gems).toBe(CHECKIN_GEMS[6]);

        await dbPool.query(`UPDATE daily_checkins SET last_claim_at = now() - interval '25 hours' WHERE user_id = $1`, [user]);
        const day8 = await claimCheckin(user);
        expect(day8.ok).toBe(true);
        if (!day8.ok) throw new Error("unreachable");
        expect(day8.day).toBe(1);
    });
});
