

export async function sendOtp(email: string, otp: string) {
    console.log(`OTP for ${email} is ${otp}`);
}

export async function sendWelcomeEmail(email: string, fullName: string) {
    console.log(`Welcome email for ${email} is sent`);
}

export async function sendForgotPasswordEmail(email: string, token: string) {
    console.log(`Forgot password email for ${email} is sent`);
}

export async function sendResetPasswordEmail(email: string, token: string) {
    console.log(`Reset password email for ${email} is sent`);
}
