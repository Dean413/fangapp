// app/api/wallet/bonus/route.ts
// GET ?before=<cursor>   the signed-in reader's bonus coins: balance, and every bonus they got (newest first, 20 a page)
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listBonusLots } from "@/lib/readerHistory";
import { reply } from "@/lib/auth/rules";
import { logError } from "@/lib/log";

export async function GET(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");
    try {
        return reply(200, "OK", await listBonusLots(user.id, request.nextUrl.searchParams.get("before")));
    } catch (error) {
        logError("Bonus history error:", error);
        return reply(500, "somethingWrong");
    }
}