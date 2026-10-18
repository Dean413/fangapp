// app/api/notifications/read/route.ts
// POST { ids: string[] }   mark these notifications as read
// POST { all: true }       mark every notification as read
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { markAllRead, markRead } from "@/lib/notifications";
import { readJson, reply } from "@/lib/auth/rules";

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "Please sign in first");

    const body = await readJson(request);
    try {
        if (body?.all === true) {
            await markAllRead(user.id);
            return reply(200, "OK");
        }
        if (!Array.isArray(body?.ids)) return reply(400, "Invalid request");
        const updated = await markRead(user.id, body.ids as string[]);
        return reply(200, "OK", { updated });
    } catch (error) {
        console.error("Notifications read error:", error);
        return reply(500, "Couldn't update your notifications.");
    }
}