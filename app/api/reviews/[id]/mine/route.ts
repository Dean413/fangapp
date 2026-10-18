// app/api/reviews/mine/route.ts
// GET ?before=<review id>   the signed-in reader's reviews (My Reviews), newest first
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listMyReviews } from "@/lib/userActions/review";
import { reply } from "@/lib/auth/rules";

export async function GET(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "Please sign in first");
    try {
        const response = reply(200, "OK", await listMyReviews(user.id, request.nextUrl.searchParams.get("before")));
        response.headers.set("Cache-Control", "no-store");
        return response;
    } catch (error) {
        console.error("My reviews error:", error);
        return reply(500, "Couldn't load your reviews. Please try again.");
    }
}