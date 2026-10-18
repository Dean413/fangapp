// app/api/comments/[id]/like/route.ts
// POST { like: true | false }   like or unlike a chapter comment
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { setCommentLike } from "@/lib/userActions/comments";
import { readJson, reply } from "@/lib/auth/rules";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "Please sign in to like comments");
    const { id } = await params;
    const body = await readJson(request);
    if (typeof body?.like !== "boolean") return reply(400, "Invalid request");
    try {
        const result = await setCommentLike(user.id, id, body.like);
        if (!result.ok) return reply(result.status, result.message);
        return reply(200, "OK", { liked: result.liked, likes: result.likes });
    } catch (error) {
        console.error("Comment like error:", error);
        return reply(500, "Couldn't update the like. Please try again.");
    }
}