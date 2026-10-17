// app/api/library/status/route.ts
// For a story page: ?id=<book slug> → is it in the library, and the last chapter opened (for "Continue reading")
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getBookStatus } from "@/lib/library";
import { reply } from "@/lib/auth/rules";

export async function GET(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(200, "OK", { saved: false, lastChapter: null });

    const id = (request.nextUrl.searchParams.get("id") ?? "").trim();
    if (!id || id.length > 200) return reply(400, "Book not found");
    try {
        const status = await getBookStatus(user.id, id);
        if (!status) return reply(404, "Book not found");
        return reply(200, "OK", status);
    } catch (error) {
        console.error("Library status error:", error);
        return reply(500, "Something went wrong");
    }
}