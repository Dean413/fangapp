// lib/auth/apple.ts
import "server-only";
import * as jose from "jose";
import { AUTH_CONFIG } from "@/lib/auth/authConfig";
import type { ProviderProfile } from "@/lib/auth/account";

const JWKS = jose.createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"), {
    timeoutDuration: 15000,
    cooldownDuration: 30000,
});

export async function verifyAppleToken(idToken: string, fullName: string): Promise<ProviderProfile> {
    if (!AUTH_CONFIG.appleClientID) throw new Error("Apple sign-in is not set up (APPLE_CLIENT_ID)");

    const { payload } = await jose.jwtVerify(idToken, JWKS, {
        issuer: "https://appleid.apple.com",
        audience: AUTH_CONFIG.appleClientID,
    });
    if (typeof payload.sub !== "string") throw new Error("Apple profile incomplete");
    if (typeof payload.email !== "string" || !payload.email) throw new Error("APPLE_NO_EMAIL");
    const verified = payload.email_verified === true || payload.email_verified === "true";
    if (!verified) throw new Error("APPLE_NO_EMAIL");
    return { provider: "apple", providerUserId: payload.sub, email: payload.email, emailVerified: true, name: fullName };
}