// app/api/notifications/route.ts
// GET    ?tab=all|unread|mentions|transactions&before=<id>   a page of the reader's notifications (newest first).
//        The first page also fills in anything new (see lib/notifications.ts).
// DELETE { ids: [...] }                  delete those notifications
//        { all: true, tab }              delete everything in that tab
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
    deleteAllNotifications,
    deleteNotifications,
    listNotifications,
    NOTIFICATION_TABS,
    syncNotifications,
    type NotificationTab,
} from "@/lib/notifications";
import { readJson, reply } from "@/lib/auth/rules";

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

export async function DELETE(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");

    const body = await readJson(request);
    if (!body) return reply(400, "invalidRequest");

    try {
        if (body.all === true) {
            const asked = body.tab as NotificationTab;
            const tab: NotificationTab = NOTIFICATION_TABS.includes(asked) ? asked : "all";
            return reply(200, "OK", { count: await deleteAllNotifications(user.id, tab) });
        }

        const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === "string") : [];
        if (ids.length === 0) return reply(400, "invalidRequest");
        return reply(200, "OK", { count: await deleteNotifications(user.id, ids) });
    } catch (error) {
        console.error("Notifications delete error:", error);
        return reply(500, "couldntDeleteNotifications");
    }
}