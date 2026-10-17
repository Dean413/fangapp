// app/api/rewards/reading/claim/route.ts
// Claims a reading milestone ({ minutes: 15 | 30 | 60 | 90 }). Paid only if the server's own count reached it,
// once per 24-hour period.
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { claimReadingReward } from "@/lib/readingReward";
import { getWalletBalance } from "@/lib/wallet";
import { readJson, reply } from "@/lib/auth/rules";

const MESSAGES = {
    UNKNOWN: "That reward doesn't exist",
    NOT_REACHED: "Keep reading to unlock this reward",
    ALREADY_CLAIMED: "You've already claimed this reward today",
} as const;

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "Please sign in first");

    const body = await readJson(request);
    const minutes = Number(body?.minutes);
    if (!Number.isInteger(minutes)) return reply(400, MESSAGES.UNKNOWN);

    try {
        const result = await claimReadingReward(user.id, minutes);
        if (!result.ok) return reply(409, MESSAGES[result.code], { code: result.code, status: result.status });
        return reply(200, `+${result.coins} bonus coins`, {
            coins: result.coins,
            status: result.status,
            wallet: await getWalletBalance(user.id),
        });
    } catch (error) {
        console.error("Reading reward claim error:", error);
        return reply(500, "Couldn't claim your reward. Please try again.");
    }
}