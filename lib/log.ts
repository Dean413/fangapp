// Drop-in replacement for console.error that also reports to Sentry, so production errors in
// auth and money-code routes show up there instead of only in whatever's capturing stdout.
// Call it exactly like console.error: logError("Something failed:", error) or logError("Mismatch", a, b).
import * as Sentry from "@sentry/nextjs";

export function logError(...args: unknown[]) {
    console.error(...args);
    const error = args.find((a): a is Error => a instanceof Error);
    if (error) {
        Sentry.captureException(error, { extra: { args } });
    } else {
        const message = args.filter((a) => typeof a === "string").join(" ") || "Error";
        Sentry.captureMessage(message, { level: "error", extra: { args } });
    }
}
