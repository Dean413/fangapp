// app/api/auth/forgot-password/route.ts
// Emails a password reset code. Same answer whether or not the email has an account,
// so it can't be used to find out who is registered. Google/Facebook-only accounts can use it to set a password.
// Banned and deleted accounts get no code; suspended accounts do.
import { NextRequest } from "next/server";
import { dbPool } from "@/lib/db";
import { issueCode } from "@/lib/auth/emailCode";
import { isClosedAccount } from "@/lib/auth/loginLimit";
import { sendCodeEmail } from "@/lib/auth/email";
import { isEmail, normalizeEmail, readJson, reply } from "@/lib/auth/rules";

export async function POST(request: NextRequest) {
    const body = await readJson(request);
    const email = normalizeEmail(body?.email);
    if (!isEmail(email)) return reply(400, "invalidEmail");

    const SENT = "codeSentIfAccount";

    try {
        const { rows } = await dbPool.query(`SELECT id, account_status FROM users WHERE email = $1`, [email]);
        const user = rows[0];
        if (!user || isClosedAccount(user.account_status)) return reply(200, SENT, { sent: true });

        // Under a minute since the last code (or 10 today): the last code still works, send nothing new
        const issued = await issueCode(user.id, "reset_password");
        if ("code" in issued) await sendCodeEmail("reset_password", email, issued.code);
        return reply(200, SENT, { sent: true });
    } catch (error) {
        console.error("Forgot password error:", error);
        return reply(500, "couldntSendCode");
    }
}