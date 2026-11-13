// app/api/unlocks/history/route.ts
// GET ?before=<cursor>   the chapters the signed-in reader unlocked, newest first (20 a page)
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listUnlockedChapters } from "@/lib/readerHistory";
import { reply } from "@/lib/auth/rules";
import { logError } from "@/lib/log";

export async function GET(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");
    try {
        return reply(200, "OK", await listUnlockedChapters(user.id, request.nextUrl.searchParams.get("before")));
    } catch (error) {
        logError("Unlock history error:", error);
        return reply(500, "somethingWrong");
    }
}