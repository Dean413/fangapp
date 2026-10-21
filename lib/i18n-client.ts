// lib/i18n-client.ts
// The reader's language for code that runs outside React components (the zustand stores).
// components/i18n-bridge.tsx keeps it in step with the page's locale and messages.
import { createTranslator, type AbstractIntlMessages } from "next-intl";

let translate: ((key: string, values?: Record<string, string | number>) => string) | null = null;

export function setClientMessages(locale: string, messages: AbstractIntlMessages) {
    const t = createTranslator({ locale, messages });
    translate = (key, values) => (t.has(key as never) ? t(key as never, values as never) : key);
}

// Full key, e.g. tc("Library.added"). Before the page has set the messages, the key itself comes back.
export const tc = (key: string, values?: Record<string, string | number>) => (translate ? translate(key, values) : key);
