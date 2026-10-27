// Stub for "next/headers" under Vitest (outside a real Next.js request).
// The money-code functions under test never call getRequestLocale/translateMsg, so these
// just need to exist so lib/i18n.ts can be imported.
export async function cookies() {
    return { get: (_name: string) => undefined };
}
export async function headers() {
    return { get: (_name: string) => null };
}
