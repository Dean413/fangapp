// app/api/genres/route.ts
// GET ?language=English
//   data    the genres the admin set up in Curation → Genre (stories page pills), in the admin's order
//   genres  the genres a reader can pick as favourites (enabled Primary Genre options, in the admin's order)
import { NextRequest, NextResponse } from "next/server";
import { listCuratedGenres } from "@/lib/stories";
import { getGenreOptions } from "@/lib/readerProfile";
import { translateMsg } from "@/lib/i18n";

export async function GET(request: NextRequest) {
    const language = (request.nextUrl.searchParams.get("language") ?? "").trim().slice(0, 40) || "English";

    const [data, genres] = await Promise.all([
        listCuratedGenres(language).catch((error) => {
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