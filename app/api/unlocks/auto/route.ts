// app/api/unlocks/auto/route.ts
// POST { book, enabled }   turn "Auto-Unlock Next Chapter" on or off for one book
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getStoryBySlug } from "@/lib/stories";
import { setAutoUnlock } from "@/lib/unlock";
import { readJson, reply } from "@/lib/auth/rules";

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");

    const body = await readJson(request);
    const book = typeof body?.book === "string" ? body.book.trim() : "";
    if (!book || book.length > 200 || typeof body?.enabled !== "boolean") return reply(400, "invalidRequest");

    try {
        const story = await getStoryBySlug(book);
        if (!story) return reply(404, "storyNotFound");
        await setAutoUnlock(user.id, String(story.id), body.enabled);
        return reply(200, body.enabled ? "autoUnlockOn" : "autoUnlockOff", { autoUnlock: body.enabled });
    } catch (error) {
        console.error("Auto-unlock error:", error);
        return reply(500, "couldntChangeAutoUnlock");
    }
}