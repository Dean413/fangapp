import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson, reply } from "@/lib/auth/rules";
import { logError } from "@/lib/log";
import { COMMENT_MAX, deleteOwnComment, editOwnComment, validId } from "@/lib/community";
import { msg } from "@/lib/i18n";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");
    const { id } = await params;
    if (!validId(id)) return reply(404, "commentNotFound");
    try {
        const ok = await deleteOwnComment(user.id, id);
        if (!ok) return reply(404, "commentNotFound");
        return NextResponse.json({ ok: true });
    } catch (error) {
        logError("Deleting a community comment failed:", error);
        return reply(500, "somethingWrongRetry");
    }
}

// PATCH /api/community/comments/:id  { body }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");
    const { id } = await params;
    if (!validId(id)) return reply(404, "commentNotFound");

    const input = await readJson(request);
    const body = typeof input?.body === "string" ? input.body.trim() : "";
    if (!body) return reply(400, "commentEmpty");
    if (body.length > COMMENT_MAX) return reply(400, msg("commentTooLong", { max: COMMENT_MAX }));

    try {
        const comment = await editOwnComment(user.id, id, body);
        if (!comment) return reply(404, "commentNotFound");
        return NextResponse.json({ comment });
    } catch (error) {
        logError("Editing a community comment failed:", error);
        return reply(500, "somethingWrongRetry");
    }
}