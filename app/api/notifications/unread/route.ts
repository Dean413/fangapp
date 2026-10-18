// app/api/notifications/unread/route.ts
// GET   the number of unread notifications (for a bell badge in the header). Fills in anything new first.
import { getCurrentUser } from "@/lib/auth/session";
import { syncNotifications, unreadCount } from "@/lib/notifications";
import { reply } from "@/lib/auth/rules";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return reply(401, "Please sign in first");
    try {
        await syncNotifications(user.id);
        const response = reply(200, "OK", { count: await unreadCount(user.id) });
        response.headers.set("Cache-Control", "no-store");
        return response;
    } catch (error) {
        console.error("Unread count error:", error);
        return reply(500, "Couldn't load your notifications.");
    }
}