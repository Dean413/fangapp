/* eslint-disable @typescript-eslint/no-explicit-any */
import { verifyAccessToken } from './auth/auth';
import { UserRole } from '@/app/api/models/user';

export interface AuthenticatedUserPayload {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
}

/**
 * Reusable helper to enforce JWT verification and Role-Based Access Control (RBAC)
 * on Next.js backend API endpoints.
 * 
 * If validation fails, it returns a Next.js `Response` directly (either 401 or 403) which
 * can be immediately returned from the route handler.
 * If validation succeeds, it returns the decoded User payload.
 */
export async function verifyAuth(
    req: Request,
    allowedRoles?: UserRole[]
): Promise<AuthenticatedUserPayload | Response> {
    try {
        const authHeader = req.headers.get('authorization');
        const cookieToken = req.headers.get("cookie")
            ?.split(";")
            .find(c => c.trim().startsWith("accessToken="))
            ?.split("=")[1];

        let token: string | null = null;

        // 1. Prefer Authorization header (mobile / API clients)
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }

        // 2. Fallback to cookie (web app)
        if (!token && cookieToken) {
            token = cookieToken;
        }
        if (!token) {
            return Response.json(
                { message: "Unauthorized: Token missing" },
                { status: 401 }
            );
        }

        // Verify Access Token signature and expiration
        const decoded = await verifyAccessToken(token);

        if (!decoded || typeof decoded.id !== 'string' || !decoded.email || !decoded.role) {
            return Response.json(
                { message: "Unauthorized: Invalid token payload structure" },
                { status: 401 }
            );
        }

        const userPayload: AuthenticatedUserPayload = {
            id: decoded.id,
            email: decoded.email,
            fullName: decoded.fullName ?? "",
            role: decoded.role as UserRole
        };

        // Enforce role checks if allowedRoles is specified
        if (allowedRoles && allowedRoles.length > 0) {
            if (!allowedRoles.includes(userPayload.role)) {
                return Response.json(
                    { message: "Forbidden: You do not have permission to access this resource" },
                    { status: 403 }
                );
            }
        }

        return userPayload;
    } catch (error: any) {
        console.error("RBAC Middleware Authentication Error:", error);

        // Handle specific JWT error cases
        const errorMessage = error?.name === 'JWTExpired'
            ? "Unauthorized: Token has expired"
            : "Unauthorized: Invalid or tampered token";

        return Response.json(
            { message: errorMessage },
            { status: 401 }
        );
    }
}
