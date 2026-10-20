// app/api/unlocks/auto/route.ts
// POST { book, enabled }   turn "Auto-Unlock Next Chapter" on or off for one book
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getStoryBySlug } from "@/lib/stories";
import { setAutoUnlock } from "@/lib/unlock";
import { readJson, reply } from "@/lib/auth/rules";

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "Please sign in first");

    const body = await readJson(request);
    const book = typeof body?.book === "string" ? body.book.trim() : "";
    if (!book || book.length > 200 || typeof body?.enabled !== "boolean") return reply(400, "Invalid request");

    try {
        const story = await getStoryBySlug(book);
        if (!story) return reply(404, "Story not found");
        await setAutoUnlock(user.id, String(story.id), body.enabled);
        return reply(200, body.enabled ? "Auto-unlock is on for this book" : "Auto-unlock is off", { autoUnlock: body.enabled });
    } catch (error) {
        console.error("Auto-unlock error:", error);
        return reply(500, "Couldn't change auto-unlock. Please try again.");
    }
}