// app/api/auth/verify-login/route.ts
// Two-factor sign-in, step 2: { email, code }. The code is only ever sent after the right password
// (see /api/auth/login), so a right code here finishes that sign-in.
// Unknown, closed and two-factor-off accounts get the same answer as a wrong code.
import { NextRequest } from "next/server";
import { dbPool } from "@/lib/db";
import { canUseReaderApp } from "@/lib/auth/token";
import { checkCode } from "@/lib/auth/emailCode";
import { isClosedAccount } from "@/lib/auth/loginLimit";
import { startSession } from "@/lib/auth/session";
import { prepareReader } from "@/lib/auth/account";
import { normalizeEmail, readJson, reply } from "@/lib/auth/rules";

const MESSAGES = {
    wrong: { status: 400, code: "WRONG_CODE", message: "codeIncorrect" },
    expired: { status: 410, code: "CODE_EXPIRED", message: "codeExpiredSignIn" },
    too_many: { status: 429, code: "TOO_MANY_ATTEMPTS", message: "tooManyTriesSignIn" },
} as const;

const answer = (kind: keyof typeof MESSAGES) => reply(MESSAGES[kind].status, MESSAGES[kind].message, { code: MESSAGES[kind].code });

export async function POST(request: NextRequest) {
    const body = await readJson(request);
    const email = normalizeEmail(body?.email);
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    if (!email || !/^\d{6}$/.test(code)) return answer("wrong");

    try {
        const { rows } = await dbPool.query(
            `SELECT id, email, role, account_status, email_verified_at, two_factor_enabled FROM users WHERE email = $1`,
            [email]
        );
        const user = rows[0];
        if (!user || !user.two_factor_enabled || !user.email_verified_at || !canUseReaderApp(user.role) || isClosedAccount(user.account_status)) {
            return answer("wrong");
        }

        const result = await checkCode(user.id, "login_2fa", code);
        if (result !== "ok") return answer(result);

        await startSession({ id: user.id, email: user.email, role: user.role });
        await prepareReader(user.id);
        return reply(200, "signedIn", { user: { id: user.id, email: user.email } });
    } catch (error) {
        console.error("Two-factor sign-in error:", error);
        return reply(500, "somethingWrongRetry");
    }
}