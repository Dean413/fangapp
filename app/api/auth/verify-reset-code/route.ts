// app/api/auth/verify-reset-code/route.ts
// Checks a password reset code. A right code gives a one-time pass (httpOnly cookie, sent only to the
// reset-password route) for choosing the new password within 10 minutes.
import { NextRequest, NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { checkCode, createResetSession, RESET_SESSION_COOKIE_PATH, RESET_SESSION_MINUTES } from "@/lib/auth/emailCode";
import { isClosedAccount } from "@/lib/auth/loginLimit";
import { normalizeEmail, readJson, reply } from "@/lib/auth/rules";
import { translateMsg } from "@/lib/i18n";

const MESSAGES = {
    wrong: { status: 400, message: "codeIncorrect" },
    expired: { status: 400, message: "codeExpired" },
    too_many: { status: 429, message: "tooManyTries" },
} as const;

export async function POST(request: NextRequest) {
    const body = await readJson(request);
    const email = normalizeEmail(body?.email);
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    if (!email || !/^\d{6}$/.test(code)) return reply(400, MESSAGES.wrong.message);

    try {
        const { rows } = await dbPool.query(`SELECT id, account_status FROM users WHERE email = $1`, [email]);
        const user = rows[0];
        if (!user || isClosedAccount(user.account_status)) return reply(400, MESSAGES.wrong.message);

        const result = await checkCode(user.id, "reset_password", code);
        if (result !== "ok") return reply(MESSAGES[result].status, MESSAGES[result].message);

        const token = await createResetSession(user.id);
        const response = NextResponse.json({ message: await translateMsg("codeConfirmed") });
        response.cookies.set("reset_session", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: RESET_SESSION_COOKIE_PATH,
            maxAge: RESET_SESSION_MINUTES * 60,
        });
        return response;
    } catch (error) {
        console.error("Verify reset code error:", error);
        return reply(500, "somethingWrongRetry");
    }
}