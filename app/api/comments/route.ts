// app/api/comments/route.ts
// GET  ?chapter=<chapter id>&before=<comment id>   a chapter's comments (newest first) with their replies
// POST { chapterId, content, parentId? }           comment on a chapter, or reply to a comment
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { addComment, listChapterComments } from "@/lib/userActions/comments";
import { readJson, reply } from "@/lib/auth/rules";

export async function GET(request: NextRequest) {
    const chapter = request.nextUrl.searchParams.get("chapter") ?? "";
    try {
        const user = await getCurrentUser();
        const page = await listChapterComments(chapter, user?.id ?? null, request.nextUrl.searchParams.get("before"));
        if (!page) return reply(404, "chapterNotFound");
        const response = await reply(200, "OK", page);
        response.headers.set("Cache-Control", "no-store");
        return response;
    } catch (error) {
        console.error("Comments load error:", error);
        return reply(500, "couldntLoadComments");
    }
}

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInToComment");
    const body = await readJson(request);
    try {
        const result = await addComment(user.id, body?.chapterId, body?.content, body?.parentId);
        if (!result.ok) return reply(result.status, result.message);
        return reply(200, "commentPosted", { comment: result.comment, parentId: result.parentId });
    } catch (error) {
        console.error("Comment save error:", error);
        return reply(500, "couldntPostComment");
    }
}