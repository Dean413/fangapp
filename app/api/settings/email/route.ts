// app/api/settings/email/route.ts
// Step 1 of changing the email: { newEmail, password } → a code is sent to the new address.
// Accounts without a password (Google / Facebook) skip the password; the code to the new address still proves it.
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { lockedMessage } from "@/lib/auth/loginLimit";
import { issueCode, waitMessage } from "@/lib/auth/emailCode";
import { sendCodeEmail } from "@/lib/auth/email";
import { checkCurrentPassword, startEmailChange } from "@/lib/settings";
import { isEmail, normalizeEmail, readJson, reply } from "@/lib/auth/rules";

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");

    const body = await readJson(request);
    const newEmail = normalizeEmail(body?.newEmail);
    if (!isEmail(newEmail)) return reply(400, "invalidEmail", { field: "newEmail" });

    try {
        const check = await checkCurrentPassword(user.id, body?.password);
        if (typeof check === "object") return reply(429, lockedMessage(check.waitSeconds), { code: "TOO_MANY_ATTEMPTS" });
        if (check === "wrong") return reply(400, "passwordWrong", { field: "password" });

        const started = await startEmailChange(user.id, newEmail);
        if (started === "same") return reply(400, "alreadyYourEmail", { field: "newEmail" });
        if (started === "taken") return reply(409, "emailTaken", { field: "newEmail" });

        const issued = await issueCode(user.id, "change_email");
        if (!("code" in issued)) return reply(429, waitMessage(issued.waitSeconds), { code: "WAIT", waitSeconds: issued.waitSeconds });
        await sendCodeEmail("change_email", newEmail, issued.code);
        return reply(200, "codeSentNewEmail", { email: newEmail });
    } catch (error) {
        console.error("Email change error:", error);
        return reply(500, "couldntSendCode");
    }
}