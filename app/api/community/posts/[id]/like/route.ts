import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { reply } from "@/lib/auth/rules";
import { logError } from "@/lib/log";
import { toggleLike, validId } from "@/lib/community";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");
    const { id } = await params;
    if (!validId(id)) return reply(404, "postNotFound");
    try {
        const result = await toggleLike(user.id, id);
        if (!result) return reply(404, "postNotFound");
        return NextResponse.json(result);
    } catch (error) {
        logError("Liking a community post failed:", error);
        return reply(500, "somethingWrongRetry");
    }
}