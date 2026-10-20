// app/api/search/route.ts
// GET ?q=<words>&language=<e.g. English>&limit=6   search all books by title, author and tags
// (2 to 80 characters; fewer than 2 = no results).
import { NextRequest, NextResponse } from "next/server";
import { searchStories } from "@/lib/stories";

export async function GET(request: NextRequest) {
    const p = request.nextUrl.searchParams;
    const q = (p.get("q") ?? "").trim().slice(0, 80);
    const language = (p.get("language") ?? "").trim().slice(0, 40) || null;
    const limit = Number(p.get("limit")) || 20;

    if (q.length < 2) return NextResponse.json({ books: [] });
    try {
        const books = await searchStories(q, language, limit);
        return NextResponse.json({ books }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        console.error("Search error:", error);
        return NextResponse.json({ message: "Couldn't search right now", books: [] }, { status: 500 });
    }
}