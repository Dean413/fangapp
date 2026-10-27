import { dbPool } from "@/lib/db";

// Wipes every table the money-code tests touch. Run before each test so tests don't see
// state left behind by earlier ones.
export async function resetDb() {
    await dbPool.query(`
        TRUNCATE TABLE
            coin_spends, wallet_ledger, wallet_lots, chapter_unlocks, reader_auto_unlock,
            vip_daily_bonus, vip_subscriptions, vip_billing, payments, daily_checkins,
            contracts, chapters, stories, users
        RESTART IDENTITY CASCADE
    `);
}
