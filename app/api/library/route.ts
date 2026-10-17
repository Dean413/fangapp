// app/api/library/route.ts
// The signed-in reader's library.
//   GET    ?tab=reading|viewed|finished   the books on that tab, plus the ids of every saved book
//   POST   { id }                         save a book (id = the book's slug, book_id or uuid)
//   DELETE { ids, from }                  remove books from the library (from: "library")
//                                         or from the reading history (from: "history")
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { LIBRARY_TABS, addToLibrary, listLibrary, listSavedIds, removeBooks, type LibraryTab } from "@/lib/library";
import { readJson, reply } from "@/lib/auth/rules";

export async function GET(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "Please sign in first");

    const asked = request.nextUrl.searchParams.get("tab") as LibraryTab | null;
    const tab: LibraryTab = asked && LIBRARY_TABS.includes(asked) ? asked : "reading";
    try {
        const [books, saved] = await Promise.all([listLibrary(user.id, tab), listSavedIds(user.id)]);
        return reply(200, "OK", { tab, books, saved });
    } catch (error) {
        console.error("Library load error:", error);
        return reply(500, "Couldn't load your library. Please try again.");
    }
}

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "Please sign in to save books");

    const body = await readJson(request);
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    if (!id || id.length > 200) return reply(400, "Book not found");
    try {
        const result = await addToLibrary(user.id, id);
        if (result === "NOT_FOUND") return reply(404, "Book not found");
        if (result === "FULL") return reply(409, "Your library is full. Remove some books first.");
        return reply(200, "Added to your library", { saved: await listSavedIds(user.id) });
    } catch (error) {
        console.error("Library add error:", error);
        return reply(500, "Couldn't save this book. Please try again.");
    }
}

export async function DELETE(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "Please sign in first");

    const body = await readJson(request);
    const ids = Array.isArray(body?.ids) ? body.ids.filter((x: unknown): x is string => typeof x === "string") : [];
    const from = body?.from === "history" ? "history" : "library";
    if (ids.length === 0) return reply(400, "Choose the books to remove");
    try {
        const removed = await removeBooks(user.id, ids, from);
        return reply(200, removed === 1 ? "1 book removed" : `${removed} books removed`, { removed, saved: await listSavedIds(user.id) });
    } catch (error) {
        console.error("Library remove error:", error);
        return reply(500, "Couldn't remove those books. Please try again.");
    }
}