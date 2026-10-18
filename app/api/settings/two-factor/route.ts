// app/api/settings/two-factor/route.ts
// Turn two-factor sign-in on or off ({ enabled, password }). The password is required either way.
// Two-factor applies to password sign-in, so an account needs a password first.
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { lockedMessage } from "@/lib/auth/loginLimit";
import { checkCurrentPassword, setTwoFactor } from "@/lib/settings";
import { readJson, reply } from "@/lib/auth/rules";

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "Please sign in first");

    const body = await readJson(request);
    if (typeof body?.enabled !== "boolean") return reply(400, "Invalid request");

    try {
        const check = await checkCurrentPassword(user.id, body.password);
        if (check === "none") return reply(400, "Set a password first: two-factor protects password sign-in.", { code: "NO_PASSWORD" });
        if (typeof check === "object") return reply(429, lockedMessage(check.waitSeconds), { code: "TOO_MANY_ATTEMPTS" });
        if (check === "wrong") return reply(400, "Your password is wrong", { field: "password" });

        await setTwoFactor(user.id, body.enabled);
        return reply(200, body.enabled ? "Two-factor sign-in is on" : "Two-factor sign-in is off", { twoFactor: body.enabled });
    } catch (error) {
        console.error("Two-factor change error:", error);
        return reply(500, "Couldn't change two-factor sign-in. Please try again.");
    }
}