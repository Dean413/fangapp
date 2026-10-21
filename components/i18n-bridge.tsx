"use client";

import { useLocale, useMessages } from "next-intl";
import { setClientMessages } from "@/lib/i18n-client";

// Hands the page's locale and messages to code outside React (see lib/i18n-client.ts).
// Set while rendering, so they are ready before any store action runs.
export default function I18nBridge() {
    setClientMessages(useLocale(), useMessages());
    return null;
}
