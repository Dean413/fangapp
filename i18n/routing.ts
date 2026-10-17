import { createNavigation } from "next-intl/navigation";

export const locales = ["en", "fr", "de", "tr", "pt", "pl", "ja", "it", "es"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const { Link, redirect, usePathname, useRouter } =
    createNavigation({
        locales,
        defaultLocale, // ✅ REQUIRED
        localePrefix: "as-needed"
    });