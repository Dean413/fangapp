/* eslint-disable @typescript-eslint/no-explicit-any */
import * as jose from 'jose';
import bcrypt from 'bcryptjs';

const JWT_ACCESS_SECRET = new TextEncoder().encode(
    process.env.JWT_ACCESS_SECRET || 'fallback_access_secret_for_local_dev_123'
);
const JWT_REFRESH_SECRET = new TextEncoder().encode(
    process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_for_local_dev_123'
);

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export async function generateAccessToken(user: { id: string; email: string; role: string; fullName: string }): Promise<string> {
    return new jose.SignJWT({ id: user.id, email: user.email, fullName: user.fullName, role: user.role })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30m')
        .sign(JWT_ACCESS_SECRET);
}

export async function generateRefreshToken(user: { id: string; email: string }): Promise<string> {
    return new jose.SignJWT({ id: user.id, email: user.email })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(JWT_REFRESH_SECRET);
}

export async function verifyAccessToken(token: string) {
    const { payload } = await jose.jwtVerify(token, JWT_ACCESS_SECRET);
    return payload as { id: string; email: string; fullName: string; role: string;[key: string]: any };
}

export async function verifyRefreshToken(token: string) {
    const { payload } = await jose.jwtVerify(token, JWT_REFRESH_SECRET);
    return payload as { id: string; email: string;[key: string]: any };
}

// Lazy load Google JWKS remote set
let googleJWKS: any = null;
function getGoogleJWKS() {
    if (!googleJWKS) {
        googleJWKS = jose.createRemoteJWKSet(
            new URL('https://www.googleapis.com/oauth2/v3/certs')
        );
    }
    return googleJWKS;
}

export async function verifyGoogleToken(idToken: string): Promise<{ email: string; sub: string; name?: string }> {
    // If testing mock OAuth, bypass remote JWKS check
    if (process.env.ALLOW_MOCK_OAUTH === 'true' && idToken.startsWith('mock-google-')) {
        const tokenString = idToken.replace('mock-google-', '');
        const decoded = jose.decodeJwt(tokenString);
        if (decoded.iss !== 'accounts.google.com' && decoded.iss !== 'https://accounts.google.com') {
            throw new Error('Invalid mock issuer for Google');
        }
        return {
            email: decoded.email as string,
            sub: decoded.sub as string,
            name: decoded.name as string
        };
    }

    const { payload } = await jose.jwtVerify(idToken, getGoogleJWKS(), {
        issuer: ['accounts.google.com', 'https://accounts.google.com'],
    });

    if (!payload.email) {
        throw new Error('Google token payload missing email');
    }
    if (!payload.sub) {
        throw new Error('Google token payload missing sub ID');
    }

    return {
        email: payload.email as string,
        sub: payload.sub as string,
        name: payload.name as string,
    };
}

// Lazy load Apple JWKS remote set
let appleJWKS: any = null;
function getAppleJWKS() {
    if (!appleJWKS) {
        appleJWKS = jose.createRemoteJWKSet(
            new URL('https://appleid.apple.com/auth/keys')
        );
    }
    return appleJWKS;
}

export async function verifyAppleToken(idToken: string): Promise<{ email: string; sub: string }> {
    // If testing mock OAuth, bypass remote JWKS check
    if (process.env.ALLOW_MOCK_OAUTH === 'true' && idToken.startsWith('mock-apple-')) {
        const tokenString = idToken.replace('mock-apple-', '');
        const decoded = jose.decodeJwt(tokenString);
        if (decoded.iss !== 'https://appleid.apple.com') {
            throw new Error('Invalid mock issuer for Apple');
        }
        return {
            email: decoded.email as string,
            sub: decoded.sub as string,
        };
    }

    const { payload } = await jose.jwtVerify(idToken, getAppleJWKS(), {
        issuer: 'https://appleid.apple.com',
    });

    if (!payload.email) {
        throw new Error('Apple token payload missing email');
    }
    if (!payload.sub) {
        throw new Error('Apple token payload missing sub ID');
    }

    return {
        email: payload.email as string,
        sub: payload.sub as string,
    };
}
