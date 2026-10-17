// app/api/auth/reset-password/route.ts
// Sets the new password using the one-time pass from verify-reset-code (reset_session cookie).
// Also confirms the email, signs the account out everywhere else and ends any sign-in lock.
import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/token";
import { RESET_SESSION_COOKIE_PATH, resetPasswordWithSession } from "@/lib/auth/emailCode";
import { newPasswordProblem, readJson, reply } from "@/lib/auth/rules";

export async function POST(request: NextRequest) {
    const body = await readJson(request);
    const password = body?.password;
    const problem = newPasswordProblem(password);
    if (problem) return reply(400, problem);

    const token = request.cookies.get("reset_session")?.value;
    if (!token) return reply(401, "Your reset has expired. Please start again.", { code: "RESET_EXPIRED" });

    try {
        const result = await resetPasswordWithSession(token, await hashPassword(password as string));
        if (result === "invalid") return reply(401, "Your reset has expired. Please start again.", { code: "RESET_EXPIRED" });
        if (result === "blocked") return reply(403, "This account can't reset its password.");

        const response = NextResponse.json({ message: "Password changed. You can sign in now." });
        response.cookies.set("reset_session", "", { path: RESET_SESSION_COOKIE_PATH, maxAge: 0 });
        return response;
    } catch (error) {
        console.error("Reset password error:", error);
        return reply(500, "Failed to update password. Please try again.");
    }
}