/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { verifyAppleToken } from "@/lib/auth/auth";
import { findOrCreateSocialUser, isActive, startSession, toPublicUser } from "@/lib/users";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { idToken } = body;

        if (!idToken) {
            return Response.json(
                { message: "idToken is required" },
                { status: 400 }
            );
        }

        // 1. Verify the Apple ID Token
        const payload = await verifyAppleToken(idToken);
        const email = payload.email.toLowerCase().trim();
        const fullName = email.split('@')[0];

        // Production has no auth-provider columns: social accounts are matched by their verified email
        const user = await findOrCreateSocialUser(email, fullName);

        if (!isActive(user)) {
            return Response.json(
                { message: `This account is ${user.account_status}` },
                { status: 403 }
            );
        }

        // Issue tokens, record the session (tokens are returned in the body for mobile clients)
        const { accessToken, refreshToken } = await startSession(user, { setCookies: false });

        return Response.json(
            {
                message: "Apple authentication successful",
                accessToken,
                refreshToken,
                user: toPublicUser(user),
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Apple Auth API error:", error);
        return Response.json(
            { message: `Apple authentication failed: ${error.message || error}` },
            { status: 401 }
        );
    }
}
