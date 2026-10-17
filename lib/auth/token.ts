// lib/auth/tokens.ts
// Passwords (bcrypt, the same format as FangWriters so one account works in both apps)
// and this app's login tokens (signed with this app's own secrets).
import "server-only";
import * as jose from "jose";
import bcrypt from "bcryptjs";
import { AUTH_CONFIG } from "./authConfig";
const ISSUER = "fang-reader";

// On the live server the secrets must be set: a missing one stops sign-in instead of
// falling back to a value anyone could know.
function signingKey(value: string, name: string): Uint8Array {
    if (!value) {
        if (process.env.NODE_ENV === "production") {
            throw new Error(`${name} is not set in lib/auth/config.ts`);
        }
        return new TextEncoder().encode(`local-dev-only-${name}`); // npm run dev only
    }
    return new TextEncoder().encode(value);
}

const accessKey = () => signingKey(AUTH_CONFIG.jwtAccessSecret, "jwtAccessSecret");
const refreshKey = () => signingKey(AUTH_CONFIG.jwtRefreshSecret, "jwtRefreshSecret");

export const ACCESS_MINUTES = 30;
export const REFRESH_DAYS = 30;

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

// Who may sign in to the reader apps: readers, and writers using their account to read
export const READER_ROLES = ["reader", "author"];
export const canUseReaderApp = (role: unknown) => typeof role === "string" && READER_ROLES.includes(role);

export type TokenUser = { id: string; email: string; role: string };
export type TokenClaims = TokenUser & { iat?: number };

async function sign(user: TokenUser, key: Uint8Array, expires: string) {
    return new jose.SignJWT({ email: user.email, role: user.role })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(user.id)
        .setIssuer(ISSUER)
        .setIssuedAt()
        .setExpirationTime(expires)
        .sign(key);
}

async function verify(token: string, key: Uint8Array): Promise<TokenClaims> {
    const { payload } = await jose.jwtVerify(token, key, { issuer: ISSUER, algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.email !== "string" || typeof payload.role !== "string") {
        throw new Error("Malformed token");
    }
    return { id: payload.sub, email: payload.email, role: payload.role, iat: payload.iat as number | undefined };
}

export const generateAccessToken = (user: TokenUser) => sign(user, accessKey(), `${ACCESS_MINUTES}m`);
export const generateRefreshToken = (user: TokenUser) => sign(user, refreshKey(), `${REFRESH_DAYS}d`);
export const verifyAccessToken = (token: string) => verify(token, accessKey());
export const verifyRefreshToken = (token: string) => verify(token, refreshKey());