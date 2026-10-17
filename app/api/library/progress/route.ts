// app/api/library/progress/route.ts
// The reading page reports the chapter that opened: { id: book slug, chapter: number }.
// Only real published chapters of visible books are recorded.
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { recordProgress } from "@/lib/library";
import { readJson, reply } from "@/lib/auth/rules";

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "Please sign in first");

    const body = await readJson(request);
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    const chapter = Number(body?.chapter);
    if (!id || id.length > 200 || !Number.isInteger(chapter)) return reply(400, "Invalid chapter");
    try {
        const ok = await recordProgress(user.id, id, chapter);
        return ok ? reply(200, "OK") : reply(404, "Chapter not found");
    } catch (error) {
        console.error("Reading progress error:", error);
        return reply(500, "Something went wrong");
    }
}