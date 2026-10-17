// Reader locale (URL prefix) → the language name saved in the database.
// "Portugese" is spelled the way it's stored everywhere.
export const LOCALE_LANGUAGE: Record<string, string> = {
    en: "English",
    ja: "Japanese",
    de: "German",
    es: "Spanish",
    fr: "French",
    it: "Italian",
    pt: "Portugese",
    pl: "Polish",
    tr: "Turkish",
};

export const LANGUAGES = Object.values(LOCALE_LANGUAGE);

export function languageForLocale(locale?: string | null): string {
    return LOCALE_LANGUAGE[(locale ?? "").toLowerCase().split("-")[0]] ?? "English";
}