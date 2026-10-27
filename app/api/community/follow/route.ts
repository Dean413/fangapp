import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson, reply } from "@/lib/auth/rules";
import { logError } from "@/lib/log";
import { toggleFollow } from "@/lib/community";

export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");
    const input = await readJson(request);
    const target = typeof input?.userId === "string" ? input.userId : "";
    if (!/^[0-9a-f-]{36}$/i.test(target)) return reply(404, "userNotFound");
    if (target === user.id) return reply(400, "cantFollowSelf");
    try {
        const result = await toggleFollow(user.id, target);
        if (!result) return reply(404, "userNotFound");
        return NextResponse.json(result);
    } catch (error) {
        logError("Following from the community failed:", error);
        return reply(500, "somethingWrongRetry");
    }
}