"use client";

// The suspension notice: "Your account has been suspended until <date> (<reason>). Please reach out to <support email>."
// Shows nothing unless the signed-in reader is suspended. AccountGate puts it under the navbar; pages with a
// sidebar (the profile pages) put it inside their content column instead, so the sidebar isn't pushed down.
import { useLocale, useTranslations } from "next-intl";
import { useAuthStore } from "@/lib/store/authStore";
import { useAccountStatus } from "@/lib/store/accountStore";

const SUPPORT_EMAIL = "support@fangapp.io";

export default function SuspensionNotice({ className = "px-4 py-3 sm:px-6" }: { className?: string }) {
    const signedIn = useAuthStore((s) => Boolean(s.user));
    const state = useAccountStatus((s) => s.state);
    const t = useTranslations("Suspension");
    const locale = useLocale();

    if (!signedIn || state?.status !== "suspended") return null;

    const until = state.suspendedUntil
        ? new Intl.DateTimeFormat(locale, { month: "long", day: "numeric", year: "numeric" }).format(new Date(state.suspendedUntil))
        : "";

    return (
        <div className={className}>
            <p role="alert" className="text-sm text-amber-700 dark:text-amber-400">
                {t.rich("notice", {
                    hasUntil: until ? "yes" : "no",
                    until,
                    hasReason: state.reason ? "yes" : "no",
                    reason: state.reason ?? "",
                    email: SUPPORT_EMAIL,
                    mail: (chunks) => (
                        <a
                            href={`mailto:${SUPPORT_EMAIL}`}
                            className="font-semibold underline hover:text-amber-800 dark:hover:text-amber-300">
                            {chunks}
                        </a>
                    ),
                })}
            </p>
        </div>
    );
}