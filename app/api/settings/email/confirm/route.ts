// app/api/settings/email/confirm/route.ts
// Step 2 of changing the email: { code } from the new address. The old address gets a notice.
import { NextRequest } from "next/server";
import { getCurrentUser, startSession } from "@/lib/auth/session";
import { checkCode } from "@/lib/auth/emailCode";
import { sendEmailChangedNotice } from "@/lib/auth/email";
import { finishEmailChange, getPendingEmail } from "@/lib/settings";
import { readJson, reply } from "@/lib/auth/rules";

const WRONG = { wrong: "That code is incorrect", expired: "This code has expired. Send a new one.", too_many: "Too many wrong tries. Send a new code." } as const;

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "Please sign in first");

    const body = await readJson(request);
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    try {
        if (!(await getPendingEmail(user.id))) return reply(410, "This request has expired. Start again.", { code: "EXPIRED" });

        const result = await checkCode(user.id, "change_email", code);
        if (result !== "ok") return reply(400, WRONG[result], { code: result.toUpperCase() });

        const finished = await finishEmailChange(user.id);
        if (!finished.ok) {
            return finished.reason === "taken"
                ? reply(409, "Another account already uses that email")
                : reply(410, "This request has expired. Start again.", { code: "EXPIRED" });
        }

        // Fresh login cookies carrying the new email
        await startSession({ ...user, email: finished.newEmail });
        sendEmailChangedNotice(finished.oldEmail).catch((err) => console.error("Email changed notice failed:", err));
        return reply(200, "Your email has been changed", { email: finished.newEmail });
    } catch (error) {
        console.error("Email confirm error:", error);
        return reply(500, "Couldn't change your email. Please try again.");
    }
}