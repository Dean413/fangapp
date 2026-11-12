// app/api/rewards/engagement/route.ts
// GET                       General Engagement Rewards for the signed-in reader: ad tasks done today, social pages claimed
// POST { platform }         claims a social follow (once per platform); answers with the coins and the new wallet
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { claimSocial, findSocialTask, getEngagementStatus } from "@/lib/engagement";
import { getWalletBalance } from "@/lib/wallet";
import { readJson, reply } from "@/lib/auth/rules";
import { msg } from "@/lib/i18n";
import { logError } from "@/lib/log";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");
    try {
        return reply(200, "OK", { status: await getEngagementStatus(user.id) });
    } catch (error) {
        logError("Engagement status error:", error);
        return reply(500, "somethingWrong");
    }
}

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");
    const body = await readJson(request);
    const task = findSocialTask(body?.platform);
    if (!task) return reply(400, "invalidRequest");
    try {
        const coins = await claimSocial(user.id, task.id);
        if (!coins) return reply(409, "rewardAlreadyClaimed", { code: "ALREADY_CLAIMED", status: await getEngagementStatus(user.id) });
        return reply(200, msg("bonusCoins", { coins }), {
            coins,
            status: await getEngagementStatus(user.id),
            wallet: await getWalletBalance(user.id),
        });
    } catch (error) {
        logError("Social reward error:", error);
        return reply(500, "couldntClaimReward");
    }
}