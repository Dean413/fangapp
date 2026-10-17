// app/api/rewards/reading/heartbeat/route.ts
// "Still reading" signal from the reading page (signed-in readers). The server counts the time itself.
import { getCurrentUser } from "@/lib/auth/session";
import { recordReadingBeat } from "@/lib/readingReward";
import { reply } from "@/lib/auth/rules";

export async function POST() {
    const user = await getCurrentUser();
    if (!user) return reply(401, "Please sign in first");
    try {
        return reply(200, "OK", { seconds: await recordReadingBeat(user.id) });
    } catch (error) {
        console.error("Reading signal error:", error);
        return reply(500, "Something went wrong");
    }
}