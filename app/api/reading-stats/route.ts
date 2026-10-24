// app/api/reading-stats/route.ts
// The reader's own reading stats for the profile page.
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getReadingStats, type StatsRange } from "@/lib/readingStat";

export async function GET(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Please sign in first" }, { status: 401 });

    const asked = request.nextUrl.searchParams.get("range");
    const range: StatsRange = asked === "month" || asked === "lastYear" ? asked : "year";

    try {
        const stats = await getReadingStats(user.id, range);
        return NextResponse.json(stats, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        console.error("Reading stats error:", error);
        return NextResponse.json({ message: "Couldn't load your reading stats" }, { status: 500 });
    }
}