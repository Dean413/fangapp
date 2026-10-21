// app/api/settings/password/route.ts
// Change the password ({ current, password }), or set a first one for a Google / Facebook-only account ({ password }).
// Signs the account out on every other device; this browser stays signed in.
import { NextRequest } from "next/server";
import { getCurrentUser, startSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/token";
import { lockedMessage } from "@/lib/auth/loginLimit";
import { checkCurrentPassword, setPassword } from "@/lib/settings";
import { newPasswordProblem, readJson, reply } from "@/lib/auth/rules";

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");

    const body = await readJson(request);
    const problem = newPasswordProblem(body?.password);
    if (problem) return reply(400, problem, { field: "password" });

    try {
        const check = await checkCurrentPassword(user.id, body?.current);
        if (typeof check === "object") return reply(429, lockedMessage(check.waitSeconds), { code: "TOO_MANY_ATTEMPTS" });
        if (check === "wrong") return reply(400, "currentPasswordWrong", { field: "current" });
        // "none" = no password yet (Google / Facebook account): setting a first one is allowed

        await setPassword(user.id, await hashPassword(body!.password as string));
        await startSession(user);
        return reply(200, check === "none" ? "passwordSet" : "passwordChanged");
    } catch (error) {
        console.error("Password change error:", error);
        return reply(500, "couldntChangePassword");
    }
}