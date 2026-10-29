import { NextRequest } from "next/server";
import { hashPassword } from "@/lib/auth/token";
import { withTransaction } from "@/lib/auth/transaction";
import { issueCode } from "@/lib/auth/emailCode";
import { sendCodeEmail } from "@/lib/auth/email";
import { cleanName, createReaderProfile } from "@/lib/auth/account";
import { isEmail, newPasswordProblem, normalizeEmail, readJson, reply } from "@/lib/auth/rules";
import { rememberReferrer } from "@/lib/referral";
import { logError } from "@/lib/log";

export async function POST(request: NextRequest) {
    const body = await readJson(request);
    if (!body) return reply(400, "invalidRequest");

    const fullName = cleanName(body.fullName);
    const email = normalizeEmail(body.email);
    const password = body.password;

    if (fullName.length < 2) return reply(400, "enterFullName");
    if (!isEmail(email)) return reply(400, "invalidEmail");
    const passwordProblem = newPasswordProblem(password);
    if (passwordProblem) return reply(400, passwordProblem);

    try {
        const passwordHash = await hashPassword(password as string);

        const userId = await withTransaction(async (client) => {
            const { rows } = await client.query(
                `SELECT id, role, email_verified_at FROM users WHERE email = $1 FOR UPDATE`,
                [email]
            );
            const found = rows[0];

            if (found) {
                // Started signing up before but never confirmed: take the new details, send a new code
                if (found.role === "reader" && !found.email_verified_at) {
                    await client.query(`UPDATE users SET password_hash = $2 WHERE id = $1`, [found.id, passwordHash]);
                    await client.query(`UPDATE reader_profiles SET full_name = $2, updated_at = now() WHERE user_id = $1`, [found.id, fullName]);
                    return found.id as string;
                }
                throw new Error("EMAIL_ALREADY_EXISTS");
            }

            const { rows: created } = await client.query(
                `INSERT INTO users (email, password_hash, role, email_verified_at)
                 VALUES ($1, $2, 'reader', NULL)
                 RETURNING id`,
                [email, passwordHash]
            );
            await createReaderProfile(client, created[0].id, fullName);
            return created[0].id as string;
        });

        // The invite link's cookie is in this request: save who invited this reader (never fails the sign-up)
        await rememberReferrer(userId);

        // Email the code (if one went out less than a minute ago, that one still works)
        const issued = await issueCode(userId, "verify_email");
        if ("code" in issued) {
            try {
                await sendCodeEmail("verify_email", email, issued.code);
            } catch (emailError) {
                logError("Verification code email error:", emailError);
            }
        }

        return reply(201, "codeSent", { verify: true, email });
    } catch (error) {
        if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
            return reply(409, "emailExists", { code: "EMAIL_EXISTS" });
        }
        logError("Signup error:", error);
        return reply(500, "cantCreateAccount");
    }
}