// lib/i18n.ts
// The reader's language for API routes and emails. API requests skip the locale middleware, so the locale
// comes from the NEXT_LOCALE cookie (set when the reader picks a language), then the browser's
// Accept-Language (the middleware leaves the cookie unset when that already matches), then English.
import "server-only";
import { cookies, headers } from "next/headers";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { defaultLocale, locales, type Locale } from "@/i18n/routing";

export type MessageValues = Record<string, string | number>;

// A message key in the "Api" namespace, with its values when it has any
export type Msg = string | { key: string; values?: MessageValues };

export const msg = (key: string, values?: MessageValues): Msg => ({ key, values });

export async function getRequestLocale(): Promise<Locale> {
    try {
        const cookie = (await cookies()).get("NEXT_LOCALE")?.value;
        if (hasLocale(locales, cookie)) return cookie;

        const accept = (await headers()).get("accept-language") ?? "";
        for (const part of accept.split(",")) {
            const tag = part.split(";")[0].trim().toLowerCase().split("-")[0];
            if (hasLocale(locales, tag)) return tag;
        }
    } catch {
        // Outside a request (no cookies or headers): use the default
    }
    return defaultLocale;
}

// Translates an "Api" message for this request. Text that isn't a key (e.g. "OK") comes back as it is.
export async function translateMsg(message: Msg, locale?: Locale): Promise<string> {
    const { key, values } = typeof message === "string" ? { key: message, values: undefined } : message;
    const t = await getTranslations({ locale: locale ?? (await getRequestLocale()), namespace: "Api" });
    return t.has(key) ? t(key, values) : key;
}
