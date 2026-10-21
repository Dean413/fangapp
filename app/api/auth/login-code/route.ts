// app/api/auth/login-code/route.ts
// Two-factor sign-in: send a new code ({ email }). Only works while a sign-in is waiting for its code
// (a code was sent after the right password in the last 15 minutes), so it can't be used to send codes freely.
// Always gives the same answer, so it doesn't show which emails have accounts.
import { NextRequest } from "next/server";
import { dbPool } from "@/lib/db";
import { issueCode, waitMessage } from "@/lib/auth/emailCode";
import { sendCodeEmail } from "@/lib/auth/email";
import { normalizeEmail, readJson, reply } from "@/lib/auth/rules";

export async function POST(request: NextRequest) {
    const body = await readJson(request);
    const email = normalizeEmail(body?.email);
    if (!email) return reply(400, "invalidRequest");

    try {
        const { rows } = await dbPool.query(
            `SELECT u.id, u.email FROM users u
             JOIN email_codes c ON c.user_id = u.id AND c.purpose = 'login_2fa'
             WHERE u.email = $1 AND u.two_factor_enabled AND c.sent_at > now() - interval '15 minutes'
               AND COALESCE(u.account_status, 'active') NOT IN ('banned', 'deleted')`,
            [email]
        );
        const user = rows[0];
        if (user) {
            const issued = await issueCode(user.id, "login_2fa");
            if (!("code" in issued)) return reply(429, waitMessage(issued.waitSeconds), { code: "WAIT" });
            await sendCodeEmail("login_2fa", user.email, issued.code);
        }
        return reply(200, "newCodeSent");
    } catch (error) {
        console.error("Sign-in code resend error:", error);
        return reply(500, "couldNotResendCode");
    }
}