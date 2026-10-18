// components/email/codeEmail.tsx
// The 6-digit code emails (confirm email, reset password, two-factor sign-in, new email address, delete account)
// and the "your email was changed" notice: same look as FangWriters' code email, with this app's name and logo.
// React Email escapes every value, so nothing in it can turn into HTML.
import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
} from "@react-email/components";

export type CodeEmailKind = "verify_email" | "reset_password" | "login_2fa" | "change_email" | "delete_account" | "email_changed";

const socialLinks = [
    { name: "X", icon: "x.png", href: "https://x.com/fangappio?s=11" },
    { name: "TikTok", icon: "tiktok.png", href: "https://www.tiktok.com/@fangappio?_r=1&_t=ZP-9AdbUCzjQv1" },
    { name: "Facebook", icon: "facebook.png", href: "https://www.facebook.com/fangappio?" },
    { name: "Instagram", icon: "instagram.png", href: "https://www.instagram.com/fangwriters?igsi=OWFjYms5Y2RjZ25i&utm_source=qr" },
    { name: "YouTube", icon: "youtube.png", href: "https://youtube.com/@fangappio?si=rehBWrVdPZji-tf6" },
    { name: "LinkedIn", icon: "linkedin.png", href: "https://www.linkedin.com/company/fangappio/" },
    // { name: "Discord", icon: "discord.png", href: "https://discord.gg/7PDuynS9U" },
];

// The social icons already live on the FangWriters site
const ICONS_URL = "https://fangwriters.com/pictures/social";

const COPY: Record<CodeEmailKind, { heading: string; line: (app: string) => string; ignore: (app: string) => string }> = {
    verify_email: {
        heading: "Confirm your email",
        line: (app) => `Enter this code to finish setting up your ${app} account:`,
        ignore: (app) => `If you didn’t try to create a ${app} account, you can ignore this email.`,
    },
    reset_password: {
        heading: "Reset your password",
        line: (app) => `Enter this code to choose a new password for your ${app} account:`,
        ignore: () => "If you didn’t ask to reset your password, you can ignore this email.",
    },
    login_2fa: {
        heading: "Your sign-in code",
        line: (app) => `Enter this code to finish signing in to your ${app} account:`,
        ignore: () => "If you didn’t try to sign in, someone may know your password. Change it in Settings right away.",
    },
    change_email: {
        heading: "Confirm your new email",
        line: (app) => `Enter this code to use this email address for your ${app} account:`,
        ignore: () => "If you didn’t ask to change your email, you can ignore this email.",
    },
    delete_account: {
        heading: "Confirm deleting your account",
        line: (app) => `Enter this code to delete your ${app} account. This can’t be undone:`,
        ignore: () => "If you didn’t ask to delete your account, ignore this email and change your password.",
    },
    email_changed: {
        heading: "Your email was changed",
        line: (app) => `The email address associated with your ${app} account was just changed.`,
        ignore: (app) => `If you didn’t do this, please contact support.`,
    },
};

interface CodeEmailProps {
    kind: CodeEmailKind;
    code: string;
    minutes: number;
    appName: string;
    logoUrl?: string;
    supportEmail: string;
}

export default function CodeEmail({ kind, code, minutes, appName, logoUrl, supportEmail }: CodeEmailProps) {
    const copy = COPY[kind];

    return (
        <Html>
            <Head />
            <Preview>{code ? `Your ${appName} code is ${code}` : copy.heading}</Preview>

            <Body
                style={{
                    margin: 0,
                    padding: 0,
                    backgroundColor: "#ffffff",
                    fontFamily: "Arial, Helvetica, sans-serif",
                    color: "#111827",
                }}
            >
                <Container style={{ maxWidth: "600px", margin: "0 auto", backgroundColor: "#ffffff" }}>
                    {/* Logo */}
                    <Section style={{ textAlign: "center", padding: "30px 20px 10px" }}>
                        {logoUrl ? (
                            <Img
                                src={logoUrl}
                                alt={appName}
                                width="120"
                                style={{ display: "block", margin: "0 auto", width: "120px", height: "auto" }}
                            />
                        ) : (
                            <Text style={{ fontSize: "24px", fontWeight: 700, color: "#D90404", margin: 0 }}>{appName}</Text>
                        )}
                    </Section>

                    {/* Heading */}
                    <Heading
                        style={{
                            textAlign: "center",
                            fontSize: "22px",
                            lineHeight: "30px",
                            margin: "10px 0 22px",
                            color: "#111111",
                        }}
                    >
                        {copy.heading}
                    </Heading>

                    {/* Content */}
                    <Section style={{ padding: "0 42px 25px" }}>
                        <Text style={textStyle}>{copy.line(appName)}</Text>

                        {code && (
                            <Section style={{ textAlign: "center", margin: "6px 0 20px" }}>
                                <Text
                                    style={{
                                        display: "inline-block",
                                        margin: 0,
                                        padding: "14px 26px",
                                        backgroundColor: "#f3f4f6",
                                        borderRadius: "8px",
                                        fontSize: "30px",
                                        lineHeight: "36px",
                                        fontWeight: 700,
                                        letterSpacing: "10px",
                                        color: "#111827",
                                    }}
                                >
                                    {code}
                                </Text>
                            </Section>
                        )}

                        <Text style={textStyle}>
                            {code ? `The code works for ${minutes} minutes. ` : ""}{copy.ignore(appName)}
                        </Text>

                        {code && (
                            <Text style={textStyle}>
                                Never share this code with anyone. {appName} will never ask you for it.
                            </Text>
                        )}

                        <Text style={textStyle}>
                            Warmly,
                            <br />
                            The {appName} Team
                        </Text>
                    </Section>

                    {/* Footer */}
                    <Section style={{ backgroundColor: "#dfe3eb", textAlign: "center", padding: "16px 20px 18px" }}>
                        <Text style={{ fontSize: "9px", color: "#6b7280", margin: "0 0 6px" }}>
                            © {new Date().getFullYear()} FANGWRITERS. All rights reserved.
                        </Text>

                        {/* Social links: a centered table row, since email clients ignore flex/gap and strip SVG */}
                        <table role="presentation" align="center" cellPadding={0} cellSpacing={0} border={0} style={{ margin: "4px auto 12px" }}>
                            <tbody>
                                <tr>
                                    {socialLinks.map((social) => (
                                        <td key={social.name} style={{ padding: "0 7px" }}>
                                            <Link href={social.href}>
                                                <Img
                                                    src={`${ICONS_URL}/${social.icon}`}
                                                    alt={social.name}
                                                    width="20"
                                                    height="20"
                                                    style={{ display: "block", width: "20px", height: "20px" }}
                                                />
                                            </Link>
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>

                        <Text style={{ fontSize: "8px", lineHeight: "14px", color: "#6b7280", margin: 0 }}>
                            Need help? Contact us at{" "}
                            <Link href={`mailto:${supportEmail}`} style={{ color: "#6b7280" }}>
                                {supportEmail}
                            </Link>
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

const textStyle = {
    fontSize: "11px",
    lineHeight: "19px",
    margin: "0 0 14px",
};