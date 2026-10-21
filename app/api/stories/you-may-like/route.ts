// app/api/stories/you-may-like/route.ts
// GET ?book=<book slug>&language=<site language>&limit=14   You May Like for the book page and the reader:
// the same writer's other books first, then the same genre; only books in the reader's language.
import { NextRequest, NextResponse } from "next/server";
import { getStoryBySlug, listYouMayLike } from "@/lib/stories";
import { translateMsg } from "@/lib/i18n";

export async function GET(request: NextRequest) {
    const q = request.nextUrl.searchParams;
    const book = (q.get("book") ?? "").trim();
    if (!book || book.length > 200) return NextResponse.json([], { headers: { "Cache-Control": "no-store" } });
    const limit = Number(q.get("limit")) || 14;

    try {
        const story = await getStoryBySlug(book);
        if (!story) return NextResponse.json([], { headers: { "Cache-Control": "no-store" } });
        // The language the reader picked on the site, as saved on the stories (e.g. "English")
        const language = (q.get("language") ?? "").trim().slice(0, 40) || null;
        const books = await listYouMayLike(String(story.id), language, limit);
        return NextResponse.json(books, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        console.error("You May Like error:", error);
        return NextResponse.json({ message: await translateMsg("couldntLoadBooks") }, { status: 500 });
    }
}