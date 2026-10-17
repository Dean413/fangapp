import { sendWelcomeEmail } from "@/lib/mail";
import { verifySignupOtp } from "@/lib/signup-otp";
import { findUserByEmail } from "@/lib/users";

export async function POST(req: Request) {
    const body = await req.json();
    const { otp } = body;
    const email = body.email?.toLowerCase().trim();

    if (!email || !otp) {
        return Response.json({ message: "Email and OTP are required" }, { status: 400 });
    }

    const user = await findUserByEmail(email);
    if (!user) {
        return Response.json({ message: "User not found" }, { status: 404 });
    }

    // verify otp
    const verified = await verifySignupOtp(email, String(otp));
    if (!verified) {
        return Response.json({ message: "Invalid or expired OTP" }, { status: 400 });
    }

    // send welcome email
    await sendWelcomeEmail(email, user.full_name);

    return Response.json({ message: "User verified successfully" }, { status: 200 });
}
