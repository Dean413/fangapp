// app/api/genres/route.ts
// GET:
//   data    the genres that have visible stories, with their link slugs (stories page pills)
//   genres  the genres a reader can pick as favourites (enabled Primary Genre options, in the admin's order)
import { NextResponse } from "next/server";
import { listGenres } from "@/lib/stories";
import { getGenreOptions } from "@/lib/readerProfile";

export async function GET() {
    const [data, genres] = await Promise.all([
        listGenres().catch((error) => {
            console.error("Story genres error:", error);
            return null;
        }),
        getGenreOptions().catch((error) => {
            console.error("Genre options error:", error);
            return null;
        }),
    ]);

    if (data === null && genres === null) {
        return NextResponse.json({ message: "Couldn't load genres", data: [], genres: [] }, { status: 500 });
    }
    return NextResponse.json({ data: data ?? [], genres: genres ?? [] });
}