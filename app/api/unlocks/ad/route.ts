// app/api/unlocks/ad/route.ts
// POST { book, chapter }   unlock a paid chapter with 2 of today's watched ads (no coins).
// Answers with the full chapter and the ad status; unlocking twice never uses ads twice.
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getChapter, getStoryBySlug } from "@/lib/stories";
import { unlockWithAds } from "@/lib/adReward";
import { readJson, reply } from "@/lib/auth/rules";
import { msg } from "@/lib/i18n";
import { logError } from "@/lib/log";

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInToUnlock");

    const body = await readJson(request);
    const book = typeof body?.book === "string" ? body.book.trim() : "";
    const chapterNumber = Number(body?.chapter);
    if (!book || book.length > 200 || !Number.isInteger(chapterNumber) || chapterNumber < 1) {
        return reply(400, "invalidRequest");
    }

    try {
        const story = await getStoryBySlug(book);
        if (!story) return reply(404, "storyNotFound");

        const result = await unlockWithAds(user.id, String(story.id), story.startPaywallChapter, chapterNumber);
        if (!result.ok) {
            if (result.code === "NEED_ADS") return reply(402, "watchMoreAds", { code: result.code, status: result.status });
            if (result.code === "EARLIER_LOCKED") {
                return reply(409, msg("unlockEarlierFirst", { chapter: result.firstLocked! }), { code: result.code, firstLocked: result.firstLocked });
            }
            if (result.code !== "NOT_PAID") {
                return reply(result.code === "NOT_FOUND" ? 404 : 403, result.code === "NOT_FOUND" ? "chapterNotFoundDot" : "cantUnlock", { code: result.code });
            }
        }

        const chapter = await getChapter(story, chapterNumber, user.id);
        return reply(200, "chapterUnlocked", { chapter, status: result.ok ? result.status : undefined });
    } catch (error) {
        logError("Ad unlock error:", error);
        return reply(500, "couldntUnlock");
    }
}