// app/api/genres/route.ts
// The genres a reader can pick as favourites (enabled Primary Genre options, in the admin's order)
import { NextResponse } from "next/server";
import { getGenreOptions } from "@/lib/readerProfile";

export async function GET() {
    try {
        return NextResponse.json({ genres: await getGenreOptions() });
    } catch (error) {
        console.error("Genres error:", error);
        return NextResponse.json({ message: "Couldn't load genres", genres: [] }, { status: 500 });
    }
}