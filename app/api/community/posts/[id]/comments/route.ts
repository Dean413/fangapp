import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson, reply } from "@/lib/auth/rules";
import { msg } from "@/lib/i18n";
import { logError } from "@/lib/log";
import { COMMENT_MAX, addComment, listComments, validId } from "@/lib/community";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!validId(id)) return reply(404, "postNotFound");
    try {
        const user = await getCurrentUser();
        const cursor = request.nextUrl.searchParams.get("cursor");
        return NextResponse.json(await listComments(user?.id ?? null, id, validId(cursor) ? cursor : null));
    } catch (error) {
        logError("Community comments failed:", error);
        return reply(500, "somethingWrongRetry");
    }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");
    const { id } = await params;
    if (!validId(id)) return reply(404, "postNotFound");

    const input = await readJson(request);
    const body = typeof input?.body === "string" ? input.body.trim() : "";
    if (!body) return reply(400, "commentEmpty");
    if (body.length > COMMENT_MAX) return reply(400, msg("commentTooLong", { max: COMMENT_MAX }));

    try {
        const result = await addComment(user.id, id, body);
        if (result.error) return reply(result.error === "postNotFound" ? 404 : 429, result.error);
        return NextResponse.json({ comment: result.comment });
    } catch (error) {
        logError("Adding a community comment failed:", error);
        return reply(500, "somethingWrongRetry");
    }
}