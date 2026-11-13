// app/api/referral/claim/route.ts
// POST { code }   from the app, once, after the first sign-in: the invite code that came with the
// Play Store install. The website does the same with its cookie, so this only matters for the app.
// Same rules: only accounts made in the last 24 hours, never after a payment, never one's own code.
import { getCurrentUser } from "@/lib/auth/session";
import { rememberReferrer } from "@/lib/referral";
import { readJson, reply } from "@/lib/auth/rules";

export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");
    const body = await readJson(request);
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    if (!/^[A-Za-z0-9]{4,20}$/.test(code)) return reply(400, "invalidRequest");
    await rememberReferrer(user.id, code); // never fails
    return reply(200, "OK");
}