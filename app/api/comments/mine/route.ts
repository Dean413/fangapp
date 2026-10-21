// app/api/comments/mine/route.ts
// GET ?before=<comment id>   the signed-in reader's chapter comments (My Reviews > Comments), newest first
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listMyComments } from "@/lib/userActions/comments";
import { reply } from "@/lib/auth/rules";

export async function GET(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");
    try {
        const response = await reply(200, "OK", await listMyComments(user.id, request.nextUrl.searchParams.get("before")));
        response.headers.set("Cache-Control", "no-store");
        return response;
    } catch (error) {
        console.error("My comments error:", error);
        return reply(500, "couldntLoadMyComments");
    }
}