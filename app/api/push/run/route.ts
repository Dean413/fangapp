// app/api/push/run/route.ts
// The push job: sends new notifications to readers' phones. Not for the app or browsers.
// Call it every 5 minutes from a scheduler with the secret, e.g. on the server's crontab:
//   */5 * * * * curl -s -X POST -H "Authorization: Bearer YOUR_PUSH_CRON_SECRET" https://fangapp.io/api/push/run
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { runPushJob } from "@/lib/push";
import { logError } from "@/lib/log";

export const maxDuration = 60;

function allowed(request: NextRequest) {
    const secret = process.env.PUSH_CRON_SECRET;
    const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!secret || !given) return false;
    const a = Buffer.from(secret);
    const b = Buffer.from(given);
    return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
    if (!allowed(request)) return NextResponse.json({ message: "Not allowed" }, { status: 401 });
    try {
        return NextResponse.json(await runPushJob());
    } catch (error) {
        logError("Push job error:", error);
        return NextResponse.json({ message: "Push job failed" }, { status: 500 });
    }
}