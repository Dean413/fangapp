import * as jose from "jose";
import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

/*
 * Production has no table for email verification codes, so the pending code lives in a
 * signed, httpOnly cookie. Only an HMAC of the code is stored, so it can't be read back
 * from the cookie.
 */

const COOKIE_NAME = "signupOtp";
const OTP_TTL_MINUTES = 15;
const SECRET = process.env.JWT_ACCESS_SECRET || "fallback_access_secret_for_local_dev_123";
const SIGNING_KEY = new TextEncoder().encode(SECRET);

function hashCode(email: string, otp: string) {
    return createHmac("sha256", SECRET).update(`${email}:${otp}`).digest("hex");
}

export async function issueSignupOtp(email: string): Promise<string> {
    const otp = randomInt(100000, 1000000).toString();

    const token = await new jose.SignJWT({ email, codeHash: hashCode(email, otp) })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${OTP_TTL_MINUTES}m`)
        .sign(SIGNING_KEY);

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/auth",
        maxAge: OTP_TTL_MINUTES * 60,
    });

    return otp;
}

export async function verifySignupOtp(email: string, otp: string): Promise<boolean> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return false;

    try {
        const { payload } = await jose.jwtVerify(token, SIGNING_KEY);
        if (payload.email !== email) return false;

        const expected = Buffer.from(String(payload.codeHash), "hex");
        const actual = Buffer.from(hashCode(email, otp), "hex");
        if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
    } catch {
        return false;
    }

    cookieStore.delete({ name: COOKIE_NAME, path: "/api/auth" });
    return true;
}
