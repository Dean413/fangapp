import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson, reply } from "@/lib/auth/rules";
import { logError } from "@/lib/log";
import { deleteOwnPost, editOwnPost, POST_MAX, validId } from "@/lib/community";
import { msg } from "@/lib/i18n";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");
    const { id } = await params;
    if (!validId(id)) return reply(404, "postNotFound");
    try {
        const ok = await deleteOwnPost(user.id, id);
        if (!ok) return reply(404, "postNotFound");
        return NextResponse.json({ ok: true });
    } catch (error) {
        logError("Deleting a community post failed:", error);
        return reply(500, "somethingWrongRetry");
    }
}

// PATCH /api/community/posts/:id  { body }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");
    const { id } = await params;
    if (!validId(id)) return reply(404, "postNotFound");

    const input = await readJson(request);
    const body = typeof input?.body === "string" ? input.body.trim() : "";
    if (body.length > POST_MAX) return reply(400, msg("postTooLong", { max: POST_MAX }));

    try {
        const post = await editOwnPost(user.id, id, body);
        if (!post) return reply(body ? 404 : 400, body ? "postNotFound" : "postEmpty");
        return NextResponse.json({ post });
    } catch (error) {
        logError("Editing a community post failed:", error);
        return reply(500, "somethingWrongRetry");
    }
}