// app/api/settings/route.ts
// The signed-in reader's account settings (for the settings page)
import { getCurrentUser } from "@/lib/auth/session";
import { getAccountSettings } from "@/lib/settings";
import { reply } from "@/lib/auth/rules";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");
    try {
        const settings = await getAccountSettings(user.id);
        if (!settings) return reply(404, "accountNotFound");
        return reply(200, "OK", { settings });
    } catch (error) {
        console.error("Settings load error:", error);
        return reply(500, "couldntLoadSettings");
    }
}