// app/api/unlocks/bulk/route.ts
// Unlock many chapters at once (the app's Download screen). Works out the price on the server.
// GET  ?book=slug&from=12            the choices: 10 / 30 / 50 / all remaining chapters, each with its price
// POST { book, from, count, price }  unlock them; count is a number or "all"; price is the price the reader saw
//                                    (if it changed, nothing is unlocked and the new price is sent back)
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getStoryBySlug } from "@/lib/stories";
import { bulkUnlock, getBulkQuote } from "@/lib/bulkUnlock";
import { getWalletBalance } from "@/lib/wallet";
import { msg } from "@/lib/i18n";
import { readJson, reply } from "@/lib/auth/rules";
import { logError } from "@/lib/log";

// The chapter to start from; none = the first locked chapter
const readFrom = (value: unknown) => {
    const n = Number(value);
    return value != null && value !== "" && Number.isInteger(n) && n >= 1 ? n : null;
};

export async function GET(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInToUnlock");

    const book = (request.nextUrl.searchParams.get("book") ?? "").trim();
    if (!book || book.length > 200) return reply(400, "invalidRequest");

    try {
        const story = await getStoryBySlug(book);
        if (!story) return reply(404, "storyNotFound");
        const quote = await getBulkQuote(user.id, String(story.id), story.startPaywallChapter, readFrom(request.nextUrl.searchParams.get("from")));
        return reply(200, "ok", { ...quote, wallet: await getWalletBalance(user.id) });
    } catch (error) {
        logError("Bulk unlock quote error:", error);
        return reply(500, "couldntUnlock");
    }
}

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInToUnlock");

    const body = await readJson(request);
    const book = typeof body?.book === "string" ? body.book.trim() : "";
    const count = body?.count === "all" ? null : Number(body?.count);
    const price = Number(body?.price);
    if (!book || book.length > 200 || (count !== null && (!Number.isInteger(count) || count < 1)) || !Number.isInteger(price) || price < 0) {
        return reply(400, "invalidRequest");
    }

    try {
        const story = await getStoryBySlug(book);
        if (!story) return reply(404, "storyNotFound");

        const result = await bulkUnlock(user.id, String(story.id), story.startPaywallChapter, readFrom(body?.from), count, price);
        if (!result.ok) {
            if (result.code === "NOT_ENOUGH") return reply(402, "notEnoughCoins", { code: result.code, price: result.price, wallet: result.wallet });
            if (result.code === "PRICE_CHANGED") return reply(409, "priceChanged", { code: result.code, price: result.price });
            if (result.code === "NOTHING") return reply(409, "nothingToUnlock", { code: result.code });
            return reply(403, "cantUnlock", { code: result.code });
        }
        return reply(200, msg("chaptersUnlocked", { count: result.unlocked }), {
            unlocked: result.unlocked,
            charged: result.charged,
            wallet: result.wallet,
        });
    } catch (error) {
        logError("Bulk unlock error:", error);
        return reply(500, "couldntUnlock");
    }
}