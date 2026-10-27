"use client";

const SDK = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

type AppleSdk = {
    auth: {
        init: (c: { clientId: string; scope: string; redirectURI: string; usePopup: boolean }) => void;
        signIn: () => Promise<{ authorization: { id_token: string }; user?: { name?: { firstName?: string; lastName?: string } } }>;
    };
};

let sdk: Promise<void> | null = null;
const loadSdk = () =>
(sdk ??= new Promise<void>((resolve, reject) => {
    if ((window as unknown as { AppleID?: AppleSdk }).AppleID) return resolve();
    const s = document.createElement("script");
    s.src = SDK;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { sdk = null; reject(new Error("Apple SDK failed to load")); };
    document.head.appendChild(s);
}));

let busy = false;

// Back to `next`, with ?auth_error=code when it failed (the sign-in messages show it)
const go = (next: string, error?: string) => {
    const url = new URL(next, window.location.origin);
    url.searchParams.delete("auth_error");
    if (error) url.searchParams.set("auth_error", error);
    window.location.href = url.pathname + url.search + url.hash;
};

export async function startAppleSignIn(next: string, link = false) {
    if (busy) return;
    busy = true;
    try {
        const cfg = await fetch("/api/auth/apple").then((r) => r.json()).catch(() => ({}));
        if (!cfg.clientId) throw new Error("Apple is not set up");

        await loadSdk();
        const AppleID = (window as unknown as { AppleID: AppleSdk }).AppleID;
        AppleID.auth.init({
            clientId: cfg.clientId,
            scope: "name email",
            redirectURI: cfg.redirectUri || window.location.origin,
            usePopup: true,
        });

        let data;
        try {
            data = await AppleID.auth.signIn();
        } catch (e) {
            const code = (e as { error?: string })?.error;
            if (code === "popup_closed_by_user" || code === "user_cancelled_authorize") { busy = false; return; }
            throw e;
        }

        const fullName = [data.user?.name?.firstName, data.user?.name?.lastName].filter(Boolean).join(" ");
        const res = await fetch("/api/auth/apple", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ idToken: data.authorization.id_token, fullName, link }),
        });
        const json = await res.json().catch(() => ({}));
        go(next, res.ok ? undefined : json.code || "apple_failed");
    } catch {
        busy = false;
        go(next, "apple_failed");
    }
}