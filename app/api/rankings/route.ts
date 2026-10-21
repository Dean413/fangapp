import { NextResponse } from "next/server";
import { getRankTypes, RANKING_PERIODS, type RankingPeriod } from "@/lib/rankings";
import { languageForLocale } from "@/lib/language";
import { translateMsg } from "@/lib/i18n";

// GET /api/rankings?locale=en&period=daily → the tabs and their ranking lists
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const language = languageForLocale(searchParams.get("locale"));
        const period = searchParams.get("period");
        const safePeriod: RankingPeriod = RANKING_PERIODS.includes(period as RankingPeriod) ? (period as RankingPeriod) : "daily";

        const data = await getRankTypes(language, safePeriod);
        return NextResponse.json({ data });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: await translateMsg("failedFetchRankings") }, { status: 500 });
    }
}