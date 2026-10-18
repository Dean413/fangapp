// app/api/rewards/daily-checkin/route.ts
// GET:  where the signed-in reader is in the 7-day check-in loop
// POST: claim today's check-in (bonus coins, expire after 2 days). Only one claim per 24 hours goes through.
import { getCurrentUser } from "@/lib/auth/session";
import { claimCheckin, getCheckinStatus } from "@/lib/reward";
import { getWalletBalance } from "@/lib/wallet";
import { reply } from "@/lib/auth/rules";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return reply(401, "Please sign in first");
    try {
        return reply(200, "OK", { status: await getCheckinStatus(user.id) });
    } catch (error) {
        console.error("Check-in status error:", error);
        return reply(500, "Couldn't load your check-in. Please try again.");
    }
}

export async function POST() {
    const user = await getCurrentUser();
    if (!user) return reply(401, "Please sign in first");
    try {
        const result = await claimCheckin(user.id);
        if (!result.ok) {
            return reply(409, "You've already claimed today's reward", { code: "ALREADY_CLAIMED", status: result.status });
        }
        return reply(200, `+${result.coins} bonus coins`, {
            day: result.day,
            coins: result.coins,
            status: result.status,
            wallet: await getWalletBalance(user.id),
        });
    } catch (error) {
        console.error("Check-in claim error:", error);
        return reply(500, "Couldn't claim your reward. Please try again.");
    }
}