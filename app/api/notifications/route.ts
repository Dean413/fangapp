// app/api/notifications/route.ts
// GET ?tab=all|unread|mentions|transactions&before=<id>   a page of the reader's notifications (newest first).
// The first page also fills in anything new (see lib/notifications.ts).
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listNotifications, NOTIFICATION_TABS, syncNotifications, type NotificationTab } from "@/lib/notifications";
import { reply } from "@/lib/auth/rules";

export async function GET(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");

    const asked = request.nextUrl.searchParams.get("tab") as NotificationTab | null;
    const tab: NotificationTab = asked && NOTIFICATION_TABS.includes(asked) ? asked : "all";
    const before = request.nextUrl.searchParams.get("before");
    try {
        if (!before) await syncNotifications(user.id);
        const page = await listNotifications(user.id, tab, before);
        const response = await reply(200, "OK", { tab, ...page });
        response.headers.set("Cache-Control", "no-store");
        return response;
    } catch (error) {
        console.error("Notifications load error:", error);
        return reply(500, "couldntLoadNotificationsRetry");
    }
}