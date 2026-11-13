// app/api/unlocks/auto/route.ts
// GET                      the books the reader unlocked chapters in (or has auto-unlock on), with each book's switch
// POST { book, enabled }   turn "Auto-Unlock Next Chapter" on or off for one book
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getStoryBySlug } from "@/lib/stories";
import { setAutoUnlock } from "@/lib/unlock";
import { listAutoUnlockBooks } from "@/lib/readerHistory";
import { readJson, reply } from "@/lib/auth/rules";
import { logError } from "@/lib/log";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");
    try {
        return reply(200, "OK", { books: await listAutoUnlockBooks(user.id) });
    } catch (error) {
        logError("Auto-unlock list error:", error);
        return reply(500, "somethingWrong");
    }
}

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
        logError("Auto-unlock error:", error);
        return reply(500, "couldntChangeAutoUnlock");
    }
}