import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";

const intl = createMiddleware({
    locales: ["en", "fr", "de", "tr", "pt", "pl", "ja", "it", "es"],
    defaultLocale: "en",
    localePrefix: "as-needed"
});

// A link like /?ref=FR48203917 remembers who invited the visitor for 30 days
export default function proxy(request: NextRequest) {
    const response = intl(request);
    const ref = request.nextUrl.searchParams.get("ref");
    if (ref && /^[A-Za-z0-9]{4,20}$/.test(ref)) {
        response.cookies.set("fang_ref", ref, {
            maxAge: 60 * 60 * 24 * 30,
            path: "/",
            sameSite: "lax",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
        });
    }
    return response;
}

export const config = {
    // Excludes /monitoring too: Sentry's tunnelRoute (next.config.ts) sends browser error
    // reports there, and the locale redirect below would otherwise swallow those requests.
    // sentry-example-page/sentry-example-api are the wizard's demo route, which live outside
    // app/[locale]/ — remove this exclusion (and the two folders) once that demo is deleted.
    matcher: ["/((?!api|_next|monitoring|sentry-example-page|sentry-example-api|.*\\..*).*)"]
};