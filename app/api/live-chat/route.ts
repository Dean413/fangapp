// app/api/live-chat/route.ts
// GET:  the reader's topics and current chat (polled; with ?token=<the one you hold> it answers just { unchanged: true } when nothing is new)
// POST: { action: "topic", topicId } | { action: "option", optionId } | { action: "answer", answer: "yes" | "no" }
//       | { action: "message", text } | { action: "rate", conversationId, rating } | { action: "skip", conversationId }
// Signed-in readers only; suspended readers can't use Live Chat.
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson, reply } from "@/lib/auth/rules";
import { logError } from "@/lib/log";
import {
    ChatError,
    answerFollowUp,
    chatToken,
    chooseOption,
    chooseTopic,
    ensureDefaultScripts,
    getChatState,
    getChatToken,
    getTopics,
    isSuspended,
    rateChat,
    sendMessage,
    skipRating,
} from "@/lib/liveChat";

const SUSPENDED_MESSAGE = "Live Chat isn't available while your account is suspended. Please reach out to support@fangapp.io.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isId = (value: unknown): value is string => typeof value === "string" && UUID.test(value);

async function state(userId: string, suspended: boolean) {
    const [topics, chat] = await Promise.all([getTopics(), getChatState(userId)]);
    return { topics, suspended, token: chatToken(chat, suspended), ...chat };
}

export async function GET(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "Please sign in to use Live Chat.");
    try {
        const suspended = await isSuspended(user.id);
        // Polling: the page sends the token it holds. Nothing changed -> answer without loading the chat.
        const known = request.nextUrl.searchParams.get("token");
        if (known && known === (await getChatToken(user.id, suspended))) return reply(200, "OK", { unchanged: true });
        await ensureDefaultScripts();
        return reply(200, "OK", await state(user.id, suspended));
    } catch (error) {
        if (error instanceof ChatError) return reply(error.status, error.message);
        logError("Live chat load error:", error);
        return reply(500, "Couldn't load Live Chat. Please try again.");
    }
}

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "Please sign in to use Live Chat.");

    const body = await readJson(request);
    const action = typeof body?.action === "string" ? body.action : "";
    const topicId = body?.topicId, optionId = body?.optionId, conversationId = body?.conversationId;
    const answer = body?.answer, text = body?.text;

    try {
        if (await isSuspended(user.id)) return reply(403, SUSPENDED_MESSAGE, { suspended: true });

        switch (action) {
            case "topic":
                if (!isId(topicId)) return reply(400, "invalidRequest");
                await chooseTopic(user.id, topicId);
                break;
            case "option":
                if (!isId(optionId)) return reply(400, "invalidRequest");
                await chooseOption(user.id, optionId);
                break;
            case "answer":
                if (answer !== "yes" && answer !== "no") return reply(400, "invalidRequest");
                await answerFollowUp(user.id, answer);
                break;
            case "message":
                if (typeof text !== "string") return reply(400, "invalidRequest");
                await sendMessage(user.id, text);
                break;
            case "rate":
                if (!isId(conversationId)) return reply(400, "invalidRequest");
                await rateChat(user.id, conversationId, Number(body?.rating));
                break;
            case "skip":
                if (!isId(conversationId)) return reply(400, "invalidRequest");
                await skipRating(user.id, conversationId);
                break;
            default:
                return reply(400, "invalidRequest");
        }
        return reply(200, "OK", await state(user.id, false));
    } catch (error) {
        if (error instanceof ChatError) return reply(error.status, error.message);
        logError("Live chat action error:", error);
        return reply(500, "Something went wrong. Please try again.");
    }
}