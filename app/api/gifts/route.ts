// app/api/gifts/route.ts
// GET:  the gifts a reader can send
// POST: { book, gift }  send one gift to the book's author, paid with bought coins only
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getStoryBySlug } from "@/lib/stories";
import { listGifts, sendGift } from "@/lib/gifts";
import { readJson, reply } from "@/lib/auth/rules";
import { msg } from "@/lib/i18n";
import { logError } from "@/lib/log";

export async function GET() {
    try {
        return reply(200, "OK", { gifts: await listGifts() });
    } catch (error) {
        logError("Gift list error:", error);
        return reply(500, "couldntLoadGifts");
    }
}

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInToGift");

    const body = await readJson(request);
    const book = typeof body?.book === "string" ? body.book.trim() : "";
    const giftId = Number(body?.gift);
    if (!book || book.length > 200 || !Number.isInteger(giftId) || giftId < 1) return reply(400, "invalidRequest");

    try {
        const story = await getStoryBySlug(book);
        if (!story) return reply(404, "storyNotFound");

        const result = await sendGift(user.id, String(story.id), giftId);
        if (!result.ok) {
            if (result.code === "NOT_ENOUGH") {
                return reply(402, result.message, { code: result.code, price: result.price, wallet: result.wallet });
            }
            return reply(result.code === "NOT_FOUND" ? 404 : 403, result.message, { code: result.code });
        }
        return reply(200, msg("giftSent", { gift: result.gift.name }), { gift: result.gift, wallet: result.wallet });
    } catch (error) {
        logError("Gift error:", error);
        return reply(500, "couldntSendGift");
    }
}