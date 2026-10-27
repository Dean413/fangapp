import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { reply } from "@/lib/auth/rules";
import { logError } from "@/lib/log";
import { deleteOwnPost, validId } from "@/lib/community";

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