// app/api/stories/[slug]/fans/board/route.ts
// GET ?kind=gifts|votes&period=monthly|overall
// The fans ranking for a book (same data as the website's Top Fans and Fan Contributions pages):
// { fans: [{ rank, name, avatar, points, you }], supporters, total, me: { rank, points } }
// Gifts are ranked over all time; votes can be this month or all time.
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getFanBoard } from "@/lib/fan";
import { getStoryBySlug } from "@/lib/stories";
import { reply } from "@/lib/auth/rules";
import { logError } from "@/lib/log";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const query = request.nextUrl.searchParams;
    const kind = query.get("kind") === "votes" ? "votes" : "gifts";
    const period = kind === "votes" && query.get("period") !== "overall" ? "monthly" : "overall";

    try {
        const story = await getStoryBySlug(slug);
        if (!story) return reply(404, "storyNotFound");
        const user = await getCurrentUser();
        const board = await getFanBoard(String(story.id), kind, period, user?.id ?? null);
        return reply(200, "OK", { board });
    } catch (error) {
        logError("Fan board error:", error);
        return reply(500, "somethingWrong");
    }
}