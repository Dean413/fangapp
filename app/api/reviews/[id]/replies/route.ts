// app/api/reviews/[id]/replies/route.ts
// GET  ?after=<reply id>   replies to a review (oldest first)
// POST { content }         reply to a review (the review's writer gets a notification)
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { addReply, listReplies } from "@/lib/userActions/review";
import { readJson, reply } from "@/lib/auth/rules";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const user = await getCurrentUser();
        const page = await listReplies(id, user?.id ?? null, request.nextUrl.searchParams.get("after"));
        return reply(200, "OK", page);
    } catch (error) {
        console.error("Replies load error:", error);
        return reply(500, "Couldn't load the replies. Please try again.");
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "Please sign in to reply");
    const { id } = await params;
    const body = await readJson(request);
    try {
        const result = await addReply(user.id, id, body?.content);
        if (!result.ok) return reply(result.status, result.message);
        return reply(200, "Reply posted", { reply: result.reply });
    } catch (error) {
        console.error("Reply save error:", error);
        return reply(500, "Couldn't post your reply. Please try again.");
    }
}