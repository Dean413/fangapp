// app/api/auth/verify-email/route.ts
// Checks the 6-digit sign-up code. A right code confirms the email, signs the reader in
// and gives the 50 sign-up bonus coins (once per account).
// Unknown, already confirmed, banned and deleted accounts get the same answer as a wrong code.
import { NextRequest } from "next/server";
import { dbPool } from "@/lib/db";
import { canUseReaderApp } from "@/lib/auth/token";
import { checkCode } from "@/lib/auth/emailCode";
import { isClosedAccount } from "@/lib/auth/loginLimit";
import { startSession } from "@/lib/auth/session";
import { prepareReader } from "@/lib/auth/account";
import { normalizeEmail, readJson, reply } from "@/lib/auth/rules";

const MESSAGES = {
    wrong: { status: 400, code: "WRONG_CODE", message: "Oh no! The code you entered is incorrect" },
    expired: { status: 410, code: "CODE_EXPIRED", message: "This code has expired. Send a new one." },
    too_many: { status: 429, code: "TOO_MANY_ATTEMPTS", message: "Too many wrong tries. Send a new code." },
} as const;

const answer = (kind: keyof typeof MESSAGES) => reply(MESSAGES[kind].status, MESSAGES[kind].message, { code: MESSAGES[kind].code });

export async function POST(request: NextRequest) {
    const body = await readJson(request);
    const email = normalizeEmail(body?.email);
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    if (!email || !/^\d{6}$/.test(code)) return answer("wrong");

    try {
        const { rows } = await dbPool.query(
            `SELECT u.id, u.email, u.role, u.email_verified_at, u.account_status
             FROM users u WHERE u.email = $1`,
            [email]
        );
        const user = rows[0];
        if (!user || !canUseReaderApp(user.role) || user.email_verified_at || isClosedAccount(user.account_status)) {
            return answer("wrong");
        }

        const result = await checkCode(user.id, "verify_email", code);
        if (result !== "ok") return answer(result);

        await dbPool.query(`UPDATE users SET email_verified_at = now() WHERE id = $1 AND email_verified_at IS NULL`, [user.id]);
        // The email's owner has proved it: drop sign-in links (e.g. Facebook) whose email was never verified
        await dbPool.query(`DELETE FROM user_identities WHERE user_id = $1 AND NOT email_verified`, [user.id]);

        await startSession({ id: user.id, email: user.email, role: user.role });
        await prepareReader(user.id);

        return reply(200, "Email confirmed", { user: { id: user.id, email: user.email } });
    } catch (error) {
        console.error("Verify email error:", error);
        return reply(500, "Something went wrong. Please try again.");
    }
}