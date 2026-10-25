// app/api/option-names/route.ts
// GET ?locale=es -> { names: { "tragic past": "Pasado trágico", ... } }
// Translated genre / tag names for the site language (keys are the saved English name, lower case).
import { NextRequest, NextResponse } from "next/server";
import { dbPool } from "@/lib/db";

export async function GET(request: NextRequest) {
    const locale = request.nextUrl.searchParams.get("locale") ?? "";
    if (!/^[a-z]{2}(-[A-Za-z]{2,4})?$/.test(locale)) return NextResponse.json({ names: {} });

    try {
        const { rows } = await dbPool.query(
            `SELECT lower(btrim(o.name)) AS english, t.name
             FROM metadata_option_translations t
             JOIN metadata_options o ON o.id = t.option_id
             WHERE t.locale = $1 AND o.enabled`,
            [locale]
        );
        const names: Record<string, string> = {};
        for (const r of rows) names[r.english] = r.name;
        return NextResponse.json({ names }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
    } catch (error) {
        console.error("Option names error:", error);
        return NextResponse.json({ names: {} });
    }
}