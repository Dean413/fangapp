// app/api/auth/login/route.ts
// Email + password sign-in for readers (and writers using their account to read).
// - at most 10 tries per email in 15 minutes and 30 in 24 hours (counted before the password is checked)
// - unknown emails take as long as real ones, so timing doesn't show which emails have accounts
// - banned and deleted accounts can't sign in; suspended accounts can
// - a right password on an account whose email was never confirmed sends a code and answers
//   EMAIL_NOT_VERIFIED, so the app shows the code step
import { NextRequest } from "next/server";
import crypto from "crypto";
import { dbPool } from "@/lib/db";
import { canUseReaderApp, comparePassword, hashPassword } from "@/lib/auth/token";
import { issueCode } from "@/lib/auth/emailCode";
import { CLOSED_MESSAGE, clearLoginTries, isClosedAccount, lockedMessage, takeLoginTry } from "@/lib/auth/loginLimit";
import { sendCodeEmail } from "@/lib/auth/email";
import { startSession } from "@/lib/auth/session";
import { prepareReader } from "@/lib/auth/account";
import { normalizeEmail, readJson, reply } from "@/lib/auth/rules";

// A real bcrypt hash of a random value, checked when there's no account (or no password)
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword(crypto.randomBytes(16).toString("base64url")));

const WRONG = "Invalid email or password";

export async function POST(request: NextRequest) {
    const body = await readJson(request);
    const email = normalizeEmail(body?.email);
    const password = body?.password;

    if (!email || typeof password !== "string" || !password) return reply(400, "Email and password are required");
    if (email.length > 320 || password.length > 1024) return reply(401, WRONG);

    try {
        // Count this try first; refuse while the email is locked
        const locked = await takeLoginTry(email);
        if (locked) {
            return reply(429, lockedMessage(locked.waitSeconds), { code: "TOO_MANY_ATTEMPTS", waitSeconds: locked.waitSeconds });
        }

        const { rows } = await dbPool.query(
            `SELECT u.id, u.email, u.role, u.password_hash, u.email_verified_at, u.account_status
             FROM users u WHERE u.email = $1`,
            [email]
        );
        const user = rows[0];

        // No account, or a Google/Facebook-only account with no password: same answer, same time
        const valid = user?.password_hash
            ? await comparePassword(password, user.password_hash)
            : (await comparePassword(password, await getDummyHash()), false);
        if (!valid) return reply(401, WRONG);

        // Right password: forget the wrong tries
        await clearLoginTries(email);

        if (!canUseReaderApp(user.role)) return reply(403, "This account can't be used to sign in here.", { code: "NOT_ALLOWED" });
        if (isClosedAccount(user.account_status)) return reply(403, CLOSED_MESSAGE, { code: "ACCOUNT_CLOSED" });

        // Right password but the email was never confirmed: send a code and let the app show the code step
        if (!user.email_verified_at) {
            try {
                const issued = await issueCode(user.id, "verify_email");
                if ("code" in issued) await sendCodeEmail("verify_email", user.email, issued.code);
            } catch (emailError) {
                console.error("Verification code email error:", emailError);
            }
            return reply(403, "Please confirm your email. We've sent you a code.", { code: "EMAIL_NOT_VERIFIED", email: user.email });
        }

        await startSession({ id: user.id, email: user.email, role: user.role });
        await prepareReader(user.id);

        return reply(200, "Signed in successfully", { user: { id: user.id, email: user.email } });
    } catch (error) {
        console.error("Login error:", error);
        return reply(500, "Something went wrong. Please try again.");
    }
}