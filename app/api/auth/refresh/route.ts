/* eslint-disable @typescript-eslint/no-explicit-any */
import { verifyRefreshToken } from "@/lib/auth/auth";
import { createAccessToken, findUserById, isActive, isSessionValid, setAccessTokenCookie } from "@/lib/users";
import { cookies } from "next/headers";

export async function POST() {
    try {
        const cookieStore = await cookies()
        const refreshToken = cookieStore.get("refreshToken")?.value

        if (!refreshToken) {
            return Response.json(
                { message: "refreshToken is required" },
                { status: 400 }
            );
        }

        // 1. Verify the Refresh Token signature and that its session hasn't been revoked
        const payload = await verifyRefreshToken(refreshToken);

        if (!(await isSessionValid(refreshToken))) {
            return Response.json(
                { message: "Unauthorized: Session has ended. Please log in again." },
                { status: 401 }
            );
        }

        // 2. Fetch the latest user record to verify existence and retrieve the current role
        const user = await findUserById(payload.id);

        if (!user || !isActive(user)) {
            return Response.json(
                { message: "Unauthorized: User no longer exists or is not active" },
                { status: 401 }
            );
        }

        // 3. Generate a new Access Token
        const accessToken = await createAccessToken(user);
        await setAccessTokenCookie(accessToken);

        return Response.json(
            {
                message: "Token refreshed successfully",
                accessToken
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Token Refresh API error:", error);

        const errorMessage = error?.name === 'JWTExpired'
            ? "Unauthorized: Refresh token has expired. Please log in again."
            : "Unauthorized: Invalid refresh token.";

        return Response.json(
            { message: errorMessage },
            { status: 401 }
        );
    }
}
