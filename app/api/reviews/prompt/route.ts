// app/api/reviews/prompt/route.ts
// POST { book, chapter }   the reader finished a chapter (sent by the reading page).
// Answers { show } = open the review popup now (the book's halfway chapter and last chapter, once each).
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { reviewPromptAt } from "@/lib/userActions/review";
import { readJson, reply } from "@/lib/auth/rules";

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");

    const body = await readJson(request);
    const book = typeof body?.book === "string" ? body.book.trim() : "";
    if (!book || book.length > 200) return reply(404, "bookNotFound");

    try {
        const result = await reviewPromptAt(user.id, book, Number(body?.chapter));
        if (!result.ok) return reply(result.status, result.message);
        return reply(200, "OK", { show: result.show });
    } catch (error) {
        console.error("Review prompt error:", error);
        return reply(500, "somethingWrong");
    }
}