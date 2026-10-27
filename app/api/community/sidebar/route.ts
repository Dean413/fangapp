import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { reply } from "@/lib/auth/rules";
import { logError } from "@/lib/log";
import { sidebar } from "@/lib/community";

export async function GET() {
    try {
        const user = await getCurrentUser();
        return NextResponse.json(await sidebar(user?.id ?? null));
    } catch (error) {
        logError("Community sidebar failed:", error);
        return reply(500, "somethingWrongRetry");
    }
}