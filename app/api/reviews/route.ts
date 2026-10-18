// app/api/reviews/route.ts
// GET  ?book=<slug>&before=<review id>   a book's reviews (newest first), the average rating, and for a
//                                        signed-in reader: their own review and whether they can review
// POST { book, rating, content }         write or update the signed-in reader's review of a book
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getStoryBySlug } from "@/lib/stories";
import { getEligibility, getMyReview, getSummary, listReviews, saveReview } from "@/lib/userActions/review";
import { readJson, reply } from "@/lib/auth/rules";

export async function GET(request: NextRequest) {
    const book = request.nextUrl.searchParams.get("book")?.trim() ?? "";
    if (!book || book.length > 200) return reply(404, "Book not found");
    const before = request.nextUrl.searchParams.get("before");
    try {
        const story = await getStoryBySlug(book);
        if (!story) return reply(404, "Book not found");
        const storyId = String(story.id);
        const user = await getCurrentUser();
        const viewerId = user?.id ?? null;

        if (before) {
            return reply(200, "OK", await listReviews(storyId, viewerId, before));
        }
        const [page, summary, eligibility, mine] = await Promise.all([
            listReviews(storyId, viewerId),
            getSummary(storyId),
            getEligibility(storyId, viewerId),
            viewerId ? getMyReview(storyId, viewerId) : Promise.resolve(null),
        ]);
        const response = reply(200, "OK", { ...page, summary, eligibility, mine });
        response.headers.set("Cache-Control", "no-store");
        return response;
    } catch (error) {
        console.error("Reviews load error:", error);
        return reply(500, "Couldn't load the reviews. Please try again.");
    }
}

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "Please sign in to write a review");

    const body = await readJson(request);
    const book = typeof body?.book === "string" ? body.book.trim() : "";
    if (!book || book.length > 200) return reply(404, "Book not found");
    try {
        const result = await saveReview(user.id, book, body?.rating, body?.content);
        if (!result.ok) return reply(result.status, result.message);
        const story = await getStoryBySlug(book);
        const summary = story ? await getSummary(String(story.id)) : null;
        return reply(200, result.created ? "Review posted" : "Review updated", { review: result.review, summary });
    } catch (error) {
        console.error("Review save error:", error);
        return reply(500, "Couldn't save your review. Please try again.");
    }
}