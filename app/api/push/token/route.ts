// app/api/push/token/route.ts
// The app's phone token for push notifications.
// POST   { token, platform: "android" | "ios", locale }  save it for the signed-in reader (sent every time the app opens)
// DELETE { token }                                      forget it (signing out), so the phone stops getting this reader's pushes
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { deletePushToken, savePushToken } from "@/lib/push";
import { readJson, reply } from "@/lib/auth/rules";
import { logError } from "@/lib/log";

const readToken = (value: unknown) => (typeof value === "string" && value.length >= 20 && value.length <= 4096 ? value : null);

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");

    const body = await readJson(request);
    const token = readToken(body?.token);
    const platform = body?.platform === "ios" ? "ios" : body?.platform === "android" ? "android" : null;
    const locale = typeof body?.locale === "string" ? body.locale.slice(0, 10) : "en";
    if (!token || !platform) return reply(400, "invalidRequest");

    try {
        await savePushToken(user.id, token, platform, locale);
        return reply(200, "ok", { saved: true });
    } catch (error) {
        logError("Push token error:", error);
        return reply(500, "somethingWrongRetry");
    }
}

// No sign-in needed: the app calls this while signing out, and only the phone knows its token
export async function DELETE(request: NextRequest) {
    const body = await readJson(request);
    const token = readToken(body?.token);
    if (!token) return reply(400, "invalidRequest");
    try {
        await deletePushToken(token);
        return reply(200, "ok", { deleted: true });
    } catch (error) {
        logError("Push token delete error:", error);
        return reply(500, "somethingWrongRetry");
    }
}