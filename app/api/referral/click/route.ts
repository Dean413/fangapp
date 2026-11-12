// app/api/referral/click/route.ts
// POST { code }   sent by the website when someone opens an invite link (/?ref=CODE).
// Counted here and not in proxy.ts because link previews (WhatsApp, Messenger...) load the page
// without running it, so only real visitors are counted.
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { recordReferralClick } from "@/lib/referral";
import { readJson, reply } from "@/lib/auth/rules";

export async function POST(request: NextRequest) {
    const body = await readJson(request);
    const code = typeof body?.code === "string" ? body.code : "";
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const ip = (forwarded || request.headers.get("x-real-ip") || "").slice(0, 64) || null;
    const viewer = await getCurrentUser().catch(() => null);
    await recordReferralClick(code, ip, viewer?.id ?? null); // never fails
    return reply(200, "OK");
}