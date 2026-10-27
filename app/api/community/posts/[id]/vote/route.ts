import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson, reply } from "@/lib/auth/rules";
import { logError } from "@/lib/log";
import { validId, votePoll } from "@/lib/community";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");
    const { id } = await params;
    if (!validId(id)) return reply(404, "postNotFound");

    const input = await readJson(request);
    const option = Number(input?.option);

    try {
        const result = await votePoll(user.id, id, option);
        if (result.error) return reply(result.error === "pollNotFound" ? 404 : 400, result.error);
        return NextResponse.json({ post: result.post });
    } catch (error) {
        logError("Voting on a community poll failed:", error);
        return reply(500, "somethingWrongRetry");
    }
}
