import createMiddleware from "next-intl/middleware";

export default createMiddleware({
    locales: ["en", "fr", "de", "tr", "pt", "pl", "ja", "it", "es"],
    defaultLocale: "en",
    localePrefix: "as-needed"
});

export const config = {
    // Excludes /monitoring too: Sentry's tunnelRoute (next.config.ts) sends browser error
    // reports there, and the locale redirect below would otherwise swallow those requests.
    // sentry-example-page/sentry-example-api are the wizard's demo route, which live outside
    // app/[locale]/ — remove this exclusion (and the two folders) once that demo is deleted.
    matcher: ["/((?!api|_next|monitoring|sentry-example-page|sentry-example-api|.*\\..*).*)"]
};