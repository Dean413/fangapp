// lib/auth/email.tsx
// Sends the 6-digit code emails (confirm email / reset password) with Resend and React Email,
// the same way FangWriters sends its emails. No welcome email.
import "server-only";
import { Resend } from "resend";
import CodeEmail, { type CodeEmailKind } from "@/components/email/verificationCodeEmail"
import { AUTH_CONFIG } from "./authConfig";
const MINUTES: Record<CodeEmailKind, number> = { verify_email: 15, reset_password: 10 };

const SUBJECT: Record<CodeEmailKind, (app: string, code: string) => string> = {
    verify_email: (app, code) => `Your ${app} code: ${code}`,
    reset_password: (app, code) => `Your ${app} password reset code: ${code}`,
};

let client: Resend | null = null;
const resend = () => (client ??= new Resend(AUTH_CONFIG.resendApiKey));

export async function sendCodeEmail(kind: CodeEmailKind, to: string, code: string) {
    if (!AUTH_CONFIG.resendApiKey) {
        if (process.env.NODE_ENV !== "production") {
            console.log(`[dev] ${kind} code for ${to}: ${code}`); // npm run dev only: no email key set
            return;
        }
        throw new Error("resendApiKey is not set in lib/auth/config.ts");
    }

    const { error } = await resend().emails.send({
        from: AUTH_CONFIG.emailFrom,
        to: [to],
        subject: SUBJECT[kind](AUTH_CONFIG.appName, code),
        react: (
            <CodeEmail
                kind={kind}
                code={code}
                minutes={MINUTES[kind]}
                appName={AUTH_CONFIG.appName}
                logoUrl={AUTH_CONFIG.logoUrl || undefined}
                supportEmail={AUTH_CONFIG.supportEmail}
            />
        ),
    });

    if (error) {
        console.error("Code email failed:", error);
        throw new Error(error.message);
    }
}