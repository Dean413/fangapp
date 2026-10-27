// Stub for "next-intl/navigation" under Vitest. Its real implementation pulls in
// "next/navigation" client router hooks, which only resolve inside Next's own webpack build.
// Nothing under test calls Link/redirect/usePathname/useRouter, so no-op stand-ins are enough
// to let i18n/routing.ts (and anything importing it) load.
export function createNavigation() {
    return {
        Link: null,
        redirect: () => {
            throw new Error("redirect() stub called in tests");
        },
        usePathname: () => "",
        useRouter: () => ({}),
    };
}
