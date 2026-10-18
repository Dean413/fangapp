// lib/auth/email.tsx
// Sends the 6-digit code emails (and the "email changed" notice) with Resend and React Email,
// the same way FangWriters sends its emails. No welcome email.
import "server-only";
import { Resend } from "resend";
import CodeEmail, { type CodeEmailKind } from "@/components/email/verificationCodeEmail";
import { AUTH_CONFIG } from "@/lib/auth/authConfig";

const MINUTES: Record<CodeEmailKind, number> = {
    verify_email: 15,
    reset_password: 10,
    login_2fa: 10,
    change_email: 15,
    delete_account: 10,
    email_changed: 0,
};

const SUBJECT: Record<CodeEmailKind, (app: string, code: string) => string> = {
    verify_email: (app, code) => `Your ${app} code: ${code}`,
    reset_password: (app, code) => `Your ${app} password reset code: ${code}`,
    login_2fa: (app, code) => `Your ${app} sign-in code: ${code}`,
    change_email: (app, code) => `Confirm your new ${app} email: ${code}`,
    delete_account: (app, code) => `Confirm deleting your ${app} account: ${code}`,
    email_changed: (app) => `Your ${app} email was changed`,
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

// Tells the old address that the account's email was changed (no code)
export async function sendEmailChangedNotice(to: string) {
    await sendCodeEmail("email_changed", to, "");
}