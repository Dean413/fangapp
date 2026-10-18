import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { PROVIDERS, unlinkProvider, type Provider } from "@/lib/settings";
import { readJson, reply } from "@/lib/auth/rules";

export async function DELETE(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "Please sign in first");

    const body = await readJson(request);
    const provider = body?.provider as Provider;
    if (!PROVIDERS.includes(provider)) return reply(400, "Invalid request");
    try {
        const result = await unlinkProvider(user.id, provider);
        if (result === "last_way_in") {
            return reply(409, "Set a password first, otherwise you won't be able to sign in.", { code: "LAST_WAY_IN" });
        }
        return reply(200, "Disconnected");
    } catch (error) {
        console.error("Disconnect error:", error);
        return reply(500, "Couldn't disconnect. Please try again.");
    }
}