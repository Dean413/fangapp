// app/api/ads/claim/route.ts
// POST { nonce }   the app calls this right after a rewarded ad pays out.
// Normally the ad is counted by Google's SSV callback (app/api/ads/ssv); this answers whether it has arrived yet.
// While developing with Google's test ads (they never call SSV), set ADS_TRUST_CLIENT=true in .env and the
// ad is counted from here instead. NEVER set that in production.
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { adCounted, getAdStatus, recordAdView } from "@/lib/adReward";
import { readJson, reply } from "@/lib/auth/rules";
import { logError } from "@/lib/log";

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");

    const body = await readJson(request);
    const nonce = typeof body?.nonce === "string" ? body.nonce.trim().slice(0, 100) : "";
    if (!nonce) return reply(400, "invalidRequest");

    try {
        let counted = await adCounted(user.id, nonce);
        let limit = false;
        if (!counted && process.env.ADS_TRUST_CLIENT === "true") {
            const result = await recordAdView({ userId: user.id, transactionId: `client:${nonce}`, nonce, adUnit: null, source: "client" });
            counted = result === "OK" || result === "DUPLICATE";
            limit = result === "LIMIT";
        }
        return reply(200, "OK", { counted, limit, status: await getAdStatus(user.id) });
    } catch (error) {
        logError("Ad claim error:", error);
        return reply(500, "somethingWrong");
    }
}