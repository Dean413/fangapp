// app/api/home/route.ts
// GET /api/home?language=English&platform=Apps&tenant=fang
// The Home rows the admin set up in Multi-Tenant Curation, for the mobile app (same data as the website's home page).
// platform=Apps uses the app's own curation; if the admin hasn't set any up yet, it falls back to the Websites rows.
// Public: no sign-in needed. Cached for a minute so a busy home screen doesn't hit the database on every open.
import { NextRequest, NextResponse } from "next/server";
import { getHomeCollections } from "@/lib/home";
import { LANGUAGES } from "@/lib/language";
import { translateMsg } from "@/lib/i18n";

const TENANTS = ["fang", "fangnova", "fangverse", "fangink"];

export async function GET(request: NextRequest) {
    const q = request.nextUrl.searchParams;
    const tenant = TENANTS.includes(q.get("tenant") ?? "") ? (q.get("tenant") as string) : "fang";
    const askedLanguage = (q.get("language") ?? "English").trim();
    const language = LANGUAGES.includes(askedLanguage) ? askedLanguage : "English";
    const platform = q.get("platform") === "Websites" ? "Websites" : "Apps";

    try {
        let collections = await getHomeCollections({ tenant, language, platform });
        if (collections.length === 0 && platform === "Apps") {
            collections = await getHomeCollections({ tenant, language, platform: "Websites" });
        }
        return NextResponse.json(
            { collections },
            { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
        );
    } catch (error) {
        console.error("Home collections error:", error);
        return NextResponse.json({ message: await translateMsg("somethingWrong"), collections: [] }, { status: 500 });
    }
}