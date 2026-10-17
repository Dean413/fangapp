// app/api/rewards/reading/route.ts
// The signed-in reader's reading time in the current 24-hour period, and which milestones are reached / claimed
import { getCurrentUser } from "@/lib/auth/session";
import { getReadingStatus } from "@/lib/readingReward";
import { reply } from "@/lib/auth/rules";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return reply(401, "Please sign in first");
    try {
        return reply(200, "OK", { status: await getReadingStatus(user.id) });
    } catch (error) {
        console.error("Reading status error:", error);
        return reply(500, "Couldn't load your reading time. Please try again.");
    }
}