import { sendOtp } from "@/lib/mail";
import { issueSignupOtp } from "@/lib/signup-otp";
import { findUserByEmail } from "@/lib/users";

export async function POST(req: Request) {
    const body = await req.json();
    const email = body.email?.toLowerCase().trim();

    if (!email) {
        return Response.json({ message: "Email is required" }, { status: 400 });
    }

    const user = await findUserByEmail(email);
    if (!user) {
        return Response.json({ message: "User not found" }, { status: 404 });
    }

    // generate new otp
    const otp = await issueSignupOtp(email);

    // send otp
    await sendOtp(email, otp);
    return Response.json({ message: "OTP sent successfully" }, { status: 200 });
}
