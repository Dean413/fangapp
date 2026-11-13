// app/api/genres/route.ts
// GET ?language=English&platform=Apps
//   data    the genres the admin set up in Curation → Genre (stories page pills), in the admin's order
//           platform=Apps reads the mobile app's curation; if it has none for this language, the website's is used
//   genres  the genres a reader can pick as favourites (enabled Primary Genre options, in the admin's order)
import { NextRequest, NextResponse } from "next/server";
import { listCuratedGenres, toCurationPlatform } from "@/lib/stories";
import { getGenreOptions } from "@/lib/readerProfile";
import { translateMsg } from "@/lib/i18n";

export async function GET(request: NextRequest) {
    const q = request.nextUrl.searchParams;
    const language = (q.get("language") ?? "").trim().slice(0, 40) || "English";
    const platform = toCurationPlatform(q.get("platform"));

    const curated = async () => {
        const list = await listCuratedGenres(language, platform);
        return list.length === 0 && platform === "Apps" ? listCuratedGenres(language, "Websites") : list;
    };

    const [data, genres] = await Promise.all([
        curated().catch((error) => {
            console.error("Story genres error:", error);
            return null;
        }),
        getGenreOptions().catch((error) => {
            console.error("Genre options error:", error);
            return null;
        }),
    ]);

    if (data === null && genres === null) {
        return NextResponse.json({ message: await translateMsg("couldntLoadGenres"), data: [], genres: [] }, { status: 500 });
    }
    return NextResponse.json({ data: data ?? [], genres: genres ?? [] });
}