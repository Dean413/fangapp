// app/api/payments/google/route.ts
// Google Play purchases from the mobile app.
// GET                              the app's coin packages (coins, bonus, VIP bonus for this reader, gems) and VIP plans + status
// POST { productId, purchaseToken } after a purchase: checked with Google, then the coins / VIP are added.
//                                   Safe to send again (the app retries until it gets an answer).
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { GOOGLE_PLAY_COINS, GOOGLE_PLAY_VIP, verifyGooglePurchase, vipTopUpBonus } from "@/lib/payments/googlePlay";
import { TOPUP_GEMS } from "@/lib/payments/packages";
import { getVipStatus } from "@/lib/vip";
import { VIP_PLAN_INFO } from "@/lib/vipRates";
import { getWalletBalance } from "@/lib/wallet";
import { readJson, reply } from "@/lib/auth/rules";
import { logError } from "@/lib/log";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");
    try {
        const vip = await getVipStatus(user.id);
        const plan = vip.active ? vip.plan : null;
        return reply(200, "OK", {
            coins: GOOGLE_PLAY_COINS.map((p) => {
                const vipBonus = vipTopUpBonus(p.coins, plan);
                return { productId: p.productId, coins: p.coins, bonus: p.bonus, vipBonus, gems: TOPUP_GEMS, total: p.coins + p.bonus + vipBonus, priceCents: p.priceCents };
            }),
            vipPlans: Object.entries(GOOGLE_PLAY_VIP).map(([productId, id]) => ({ productId, plan: id, ...VIP_PLAN_INFO[id] })),
            vip,
        });
    } catch (error) {
        logError("Google Play packages error:", error);
        return reply(500, "somethingWrong");
    }
}

const PROBLEMS = {
    UNKNOWN_PRODUCT: { status: 400, message: "invalidRequest" },
    INVALID: { status: 400, message: "invalidRequest" },
    NOT_YOURS: { status: 403, message: "invalidRequest" },
    EXPIRED: { status: 410, message: "invalidRequest" },
    PENDING: { status: 202, message: "OK" },
} as const;

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");

    const body = await readJson(request);
    const productId = typeof body?.productId === "string" ? body.productId : "";
    const purchaseToken = typeof body?.purchaseToken === "string" ? body.purchaseToken : "";
    if (!productId || !purchaseToken || purchaseToken.length > 1000) return reply(400, "invalidRequest");

    try {
        const result = await verifyGooglePurchase(user.id, productId, purchaseToken);
        if (!result.ok) {
            const p = PROBLEMS[result.code];
            return reply(p.status, p.message, { code: result.code });
        }
        return reply(200, "OK", {
            kind: result.kind,
            duplicate: result.duplicate,
            wallet: await getWalletBalance(user.id),
            vip: await getVipStatus(user.id),
        });
    } catch (error) {
        logError("Google Play purchase error:", error);
        return reply(500, "somethingWrong"); // the app keeps the purchase and tries again later
    }
}