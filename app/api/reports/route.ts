// app/api/reports/route.ts
// POST { type: "review" | "review_reply" | "comment", id, reason, details? }   report a post to the admin
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createReport } from "@/lib/userActions/reports";
import { readJson, reply } from "@/lib/auth/rules";

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInToReport");
    const body = await readJson(request);
    try {
        const result = await createReport(user.id, body?.type, body?.id, body?.reason, body?.details);
        if (!result.ok) return reply(result.status, result.message);
        return reply(200, "reportThanks");
    } catch (error) {
        console.error("Report error:", error);
        return reply(500, "couldntSendReport");
    }
}