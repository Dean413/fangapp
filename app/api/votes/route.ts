// app/api/votes/route.ts
// GET:  ?book=<slug>        this month's votes for a book
// POST: { book, gems }      vote for a book with gems (1 gem = 1 vote)
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getStoryBySlug } from "@/lib/stories";
import { MAX_GEMS_PER_VOTE, getBookVotes, voteForBook } from "@/lib/votes";
import { readJson, reply } from "@/lib/auth/rules";
import { msg } from "@/lib/i18n";
import { logError } from "@/lib/log";

export async function GET(request: NextRequest) {
    const book = (request.nextUrl.searchParams.get("book") ?? "").trim();
    if (!book || book.length > 200) return reply(400, "invalidRequest");
    try {
        const story = await getStoryBySlug(book);
        if (!story) return reply(404, "storyNotFound");
        return reply(200, "OK", { votes: await getBookVotes(String(story.id)) });
    } catch (error) {
        logError("Votes load error:", error);
        return reply(500, "couldntLoadVotes");
    }
}

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInToVote");

    const body = await readJson(request);
    const book = typeof body?.book === "string" ? body.book.trim() : "";
    const gems = Number(body?.gems);
    if (!book || book.length > 200 || !Number.isInteger(gems) || gems < 1 || gems > MAX_GEMS_PER_VOTE) {
        return reply(400, "invalidRequest");
    }

    try {
        const story = await getStoryBySlug(book);
        if (!story) return reply(404, "storyNotFound");

        const result = await voteForBook(user.id, String(story.id), gems);
        if (!result.ok) {
            if (result.code === "NOT_ENOUGH") return reply(402, result.message, { code: result.code, wallet: result.wallet });
            return reply(result.code === "NOT_FOUND" ? 404 : 403, result.message, { code: result.code });
        }
        return reply(200, msg("votesSent", { count: result.gems }), { votes: result.votes, wallet: result.wallet });
    } catch (error) {
        logError("Vote error:", error);
        return reply(500, "couldntVote");
    }
}