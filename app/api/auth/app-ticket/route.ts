// app/api/auth/app-ticket/route.ts
// POST { ticket }   the mobile app trades the one-time ticket from Google / Facebook sign-in
//                   (see lib/auth/appTicket.ts) for its own sign-in cookies.
import { NextRequest } from "next/server";
import { redeemAppTicket } from "@/lib/auth/appTicket";
import { startSession } from "@/lib/auth/session";
import { canUseReaderApp } from "@/lib/auth/token";
import { readJson, reply } from "@/lib/auth/rules";
import { logError } from "@/lib/log";

export async function POST(request: NextRequest) {
    const body = await readJson(request);
    const ticket = typeof body?.ticket === "string" ? body.ticket : "";
    try {
        const user = await redeemAppTicket(ticket);
        if (!user || !canUseReaderApp(user.role)) return reply(401, "somethingWrongRetry", { code: "TICKET_INVALID" });
        const name = user.provider === "facebook" ? "Facebook" : "Google";
        await startSession({ id: user.id, email: user.email, role: user.role }, `App ${name} Login`);
        return reply(200, "OK", { user: { id: user.id, email: user.email } });
    } catch (error) {
        logError("App sign-in ticket error:", error);
        return reply(500, "somethingWrongRetry");
    }
}