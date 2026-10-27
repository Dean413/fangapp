// app/api/unlocks/route.ts
// POST { book, chapter }   unlock a paid chapter with coins (bonus coins first).
// Answers with the full chapter and the new wallet balance; unlocking twice never charges twice.
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getChapter, getStoryBySlug } from "@/lib/stories";
import { unlockChapter } from "@/lib/unlock";
import { readJson, reply } from "@/lib/auth/rules";
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

        const result = await unlockChapter(user.id, String(story.id), story.startPaywallChapter, chapterNumber);
        if (!result.ok) {
            if (result.code === "NOT_ENOUGH") {
                return reply(402, result.message, { code: result.code, price: result.price, wallet: result.wallet });
            }

            if (result.code === "EARLIER_LOCKED") {
                return reply(409, result.message, { code: result.code, firstLocked: result.firstLocked });
            }
            if (result.code !== "NOT_PAID") {
                return reply(result.code === "NOT_FOUND" ? 404 : 403, result.message, { code: result.code });
            }
        }

        const chapter = await getChapter(story, chapterNumber, user.id);
        return reply(200, result.ok && result.charged > 0 ? `Chapter unlocked` : "chapterUnlocked", {
            chapter,
            charged: result.ok ? result.charged : 0,
            free: result.ok ? result.free : false,
            wallet: result.ok ? result.wallet : undefined,
        });
    } catch (error) {
        logError("Unlock error:", error);
        return reply(500, "couldntUnlock");
    }
}