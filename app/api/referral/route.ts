// app/api/referral/route.ts
// GET   the signed-in reader's referral code and numbers
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getReferralStats } from "@/lib/referral";
import { reply } from "@/lib/auth/rules";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");
    try {
        const stats = await getReferralStats(user.id);
        if (!stats) return reply(404, "notFound");
        return NextResponse.json(stats, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        console.error("Referral stats error:", error);
        return reply(500, "somethingWentWrong");
    }
}