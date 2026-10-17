/* eslint-disable @typescript-eslint/no-explicit-any */
import { dbPool } from "@/lib/db";
import { generateAccessToken, generateRefreshToken } from "@/lib/auth/auth";
import { cookies } from "next/headers";

/*
 * Production user model:
 *  - users:         id (uuid), email, password_hash (null for social sign-ins), role, account_status
 *  - user_profiles: one row per user (user_id unique) holding full_name, pen_name, profile_image, public_id
 *  - sessions:      one row per refresh token, so sessions can be revoked on logout
 */

const REFRESH_TOKEN_DAYS = 30;

const USER_SELECT = `
    SELECT
        u.id,
        u.email,
        u.password_hash,
        u.role,
        u.account_status,
        u.created_at,
        u.last_active_at,
        COALESCE(p.full_name, '') AS full_name,
        COALESCE(p.pen_name, '') AS pen_name,
        p.profile_image,
        p.public_id
    FROM users u
    LEFT JOIN user_profiles p ON p.user_id = u.id
`;

export async function findUserByEmail(email: string) {
    const { rows } = await dbPool.query(`${USER_SELECT} WHERE u.email = $1 LIMIT 1`, [email]);
    return rows[0] || null;
}

export async function findUserById(id: string) {
    const { rows } = await dbPool.query(`${USER_SELECT} WHERE u.id = $1 LIMIT 1`, [id]);
    return rows[0] || null;
}

// Creates the users row and its user_profiles row together.
export async function createUser({
    email,
    passwordHash,
    fullName,
}: {
    email: string;
    passwordHash: string | null;
    fullName: string;
}) {
    const client = await dbPool.connect();
    try {
        await client.query("BEGIN");

        const { rows } = await client.query(
            `INSERT INTO users (email, password_hash, role)
             VALUES ($1, $2, 'reader')
             RETURNING id`,
            [email, passwordHash]
        );
        const userId = rows[0].id;

        await client.query(
            `INSERT INTO user_profiles (user_id, public_id, full_name, email)
             VALUES ($1, nextval('public_id_seq')::text, $2, $3)`,
            [userId, fullName, email]
        );

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }

    return findUserByEmail(email);
}

// Signs a social-login user in by email, creating the account on first sign-in.
export async function findOrCreateSocialUser(email: string, fullName: string) {
    const existing = await findUserByEmail(email);
    if (existing) return existing;

    try {
        return await createUser({ email, passwordHash: null, fullName });
    } catch (error: any) {
        // Lost a race with a concurrent sign-in for the same email
        if (error.code === "23505") return findUserByEmail(email);
        throw error;
    }
}

export function isActive(user: any) {
    return user.account_status === "active";
}

// The user shape returned to the frontend. Never includes password_hash.
export function toPublicUser(user: any) {
    return {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        fullName: user.full_name,
        pen_name: user.pen_name,
        profile_image: user.profile_image,
        public_id: user.public_id,
        role: user.role,
        created_at: user.created_at,
    };
}

export async function createAccessToken(user: any) {
    return generateAccessToken({
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
    });
}

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
};

export async function setAccessTokenCookie(accessToken: string) {
    const cookieStore = await cookies();
    cookieStore.set("accessToken", accessToken, { ...cookieOptions, maxAge: 60 * 15 });
}

/*
 * Issues an access + refresh token pair, records the refresh token in `sessions`,
 * and (unless setCookies is false, e.g. for mobile clients) sets both as cookies.
 */
export async function startSession(user: any, { setCookies = true } = {}) {
    const accessToken = await createAccessToken(user);
    const refreshToken = await generateRefreshToken({ id: user.id, email: user.email });
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

    await dbPool.query(
        `INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`,
        [user.id, refreshToken, expiresAt]
    );
    await dbPool.query(`UPDATE users SET last_active_at = now() WHERE id = $1`, [user.id]);

    if (setCookies) {
        await setAccessTokenCookie(accessToken);
        const cookieStore = await cookies();
        cookieStore.set("refreshToken", refreshToken, {
            ...cookieOptions,
            maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60,
        });
    }

    return { accessToken, refreshToken };
}

export async function isSessionValid(refreshToken: string) {
    const { rows } = await dbPool.query(
        `SELECT 1 FROM sessions WHERE token = $1 AND expires_at > now() LIMIT 1`,
        [refreshToken]
    );
    return rows.length > 0;
}

export async function endSession(refreshToken: string) {
    await dbPool.query(`DELETE FROM sessions WHERE token = $1`, [refreshToken]);
}
