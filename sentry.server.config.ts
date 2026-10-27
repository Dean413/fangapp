import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    // Catches errors from Server Components, Route Handlers and Server Actions on its own
    // (via instrumentation.ts's onRequestError); lib/log.ts's logError() covers errors the
    // app already catches and handles itself (most of the auth and money-code routes).
});
