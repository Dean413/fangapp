// lib/auth/email.tsx
// Sends the 6-digit code emails (and the "email changed" notice) with Resend and React Email,
// the same way FangWriters sends its emails. No welcome email.
// Written in the reader's language (see lib/i18n.ts; the texts are under "Email" in messages/*.json).
import "server-only";
import { Resend } from "resend";
import { getTranslations } from "next-intl/server";
import CodeEmail, { type CodeEmailKind } from "@/components/email/verificationCodeEmail";
import { AUTH_CONFIG } from "@/lib/auth/authConfig";
import { getRequestLocale } from "@/lib/i18n";

const MINUTES: Record<CodeEmailKind, number> = {
    verify_email: 15,
    reset_password: 10,
    login_2fa: 10,
    change_email: 15,
    delete_account: 10,
    email_changed: 0,
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

    const locale = await getRequestLocale();
    const t = await getTranslations({ locale, namespace: "Email" });
    const app = AUTH_CONFIG.appName;
    const minutes = MINUTES[kind];

    const { error } = await resend().emails.send({
        from: AUTH_CONFIG.emailFrom,
        to: [to],
        subject: t(`${kind}.subject`, { app, code }),
        react: (
            <CodeEmail
                lang={locale}
                code={code}
                appName={app}
                logoUrl={AUTH_CONFIG.logoUrl || undefined}
                supportEmail={AUTH_CONFIG.supportEmail}
                text={{
                    preview: code ? t("preview", { app, code }) : t(`${kind}.heading`),
                    heading: t(`${kind}.heading`),
                    line: t(`${kind}.line`, { app }),
                    ignore: (code ? `${t("validFor", { minutes })} ` : "") + t(`${kind}.ignore`, { app }),
                    neverShare: t("neverShare", { app }),
                    warmly: t("warmly"),
                    team: t("team", { app }),
                    rights: t("rights", { year: new Date().getFullYear() }),
                    needHelp: t("needHelp"),
                }}
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
