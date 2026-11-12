// app/api/ads/status/route.ts
// GET   the reader's ads today: { watched, limit: 20, unused, perChapter: 2, resetsAt }
import { getCurrentUser } from "@/lib/auth/session";
import { getAdStatus } from "@/lib/adReward";
import { reply } from "@/lib/auth/rules";
import { logError } from "@/lib/log";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");
    try {
        return reply(200, "OK", { status: await getAdStatus(user.id) });
    } catch (error) {
        logError("Ad status error:", error);
        return reply(500, "somethingWrong");
    }
}