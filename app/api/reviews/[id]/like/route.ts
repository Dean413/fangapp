// app/api/reviews/[id]/like/route.ts
// POST { like: true | false }   like or unlike a review
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { setReviewLike } from "@/lib/userActions/review";
import { readJson, reply } from "@/lib/auth/rules";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInToLikeReviews");
    const { id } = await params;
    const body = await readJson(request);
    if (typeof body?.like !== "boolean") return reply(400, "invalidRequest");
    try {
        const result = await setReviewLike(user.id, id, body.like);
        if (!result.ok) return reply(result.status, result.message);
        return reply(200, "OK", { liked: result.liked, likes: result.likes });
    } catch (error) {
        console.error("Review like error:", error);
        return reply(500, "couldntUpdateLike");
    }
}