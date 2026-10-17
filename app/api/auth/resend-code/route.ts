// app/api/auth/resend-code/route.ts
// Sends a new sign-up code (once a minute, 10 a day).
// Answers "sent" for unknown, confirmed, banned or deleted accounts, so it can't be used to find accounts.
import { NextRequest } from "next/server";
import { dbPool } from "@/lib/db";
import { canUseReaderApp } from "@/lib/auth/token";
import { issueCode, waitMessage } from "@/lib/auth/emailCode";
import { isClosedAccount } from "@/lib/auth/loginLimit";
import { sendCodeEmail } from "@/lib/auth/email";
import { normalizeEmail, readJson, reply } from "@/lib/auth/rules";

export async function POST(request: NextRequest) {
    const body = await readJson(request);
    const email = normalizeEmail(body?.email);
    if (!email) return reply(400, "Email is required");

    try {
        const { rows } = await dbPool.query(`SELECT id, role, email_verified_at, account_status FROM users WHERE email = $1`, [email]);
        const user = rows[0];
        if (!user || !canUseReaderApp(user.role) || user.email_verified_at || isClosedAccount(user.account_status)) {
            return reply(200, "New code sent", { sent: true });
        }

        const issued = await issueCode(user.id, "verify_email");
        if ("waitSeconds" in issued) {
            return reply(429, waitMessage(issued.waitSeconds), { code: "WAIT", waitSeconds: issued.waitSeconds });
        }

        await sendCodeEmail("verify_email", email, issued.code);
        return reply(200, "New code sent", { sent: true });
    } catch (error) {
        console.error("Resend code error:", error);
        return reply(500, "Couldn't send the code. Please try again.");
    }
}