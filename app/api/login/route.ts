/* eslint-disable @typescript-eslint/no-explicit-any */
import { comparePassword } from "@/lib/auth/auth";
import { findUserByEmail, isActive, startSession, toPublicUser } from "@/lib/users";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return Response.json(
                { message: "Email and password are required" },
                { status: 400 }
            );
        }

        const normalizedEmail = email.toLowerCase().trim();

        // 1. Fetch user from database
        const user = await findUserByEmail(normalizedEmail);

        if (!user) {
            return Response.json(
                { message: "Invalid email or password" },
                { status: 400 }
            );
        }

        // 2. Accounts created through Google/Facebook/Apple have no password
        if (!user.password_hash) {
            return Response.json(
                { message: "This account uses social sign-in. Please log in with Google, Facebook or Apple." },
                { status: 400 }
            );
        }

        // 3. Verify password
        const passwordMatches = await comparePassword(password, user.password_hash);
        if (!passwordMatches) {
            return Response.json(
                { message: "Invalid email or password" },
                { status: 400 }
            );
        }

        // 4. Block suspended / banned / deleted accounts
        if (!isActive(user)) {
            return Response.json(
                { message: `This account is ${user.account_status}` },
                { status: 403 }
            );
        }

        // 5. Issue tokens, record the session and set cookies
        await startSession(user);

        return Response.json(
            {
                message: "Login successful",
                user: toPublicUser(user),
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Login API error:", error);
        return Response.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}
