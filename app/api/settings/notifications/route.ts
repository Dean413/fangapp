// app/api/settings/notifications/route.ts
// Save the notification switches ({ newChapters, rewards, replies, emailUpdates })
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { saveNotifications } from "@/lib/settings";
import { readJson, reply } from "@/lib/auth/rules";

const KEYS = ["newChapters", "rewards", "replies", "emailUpdates"] as const;

export async function PUT(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "Please sign in first");

    const body = await readJson(request);
    if (!body || KEYS.some((k) => typeof body[k] !== "boolean")) return reply(400, "Invalid request");
    try {
        const notifications = {
            newChapters: body.newChapters as boolean,
            rewards: body.rewards as boolean,
            replies: body.replies as boolean,
            emailUpdates: body.emailUpdates as boolean,
        };
        await saveNotifications(user.id, notifications);
        return reply(200, "Notification preferences saved", { notifications });
    } catch (error) {
        console.error("Notification settings error:", error);
        return reply(500, "Couldn't save. Please try again.");
    }
}