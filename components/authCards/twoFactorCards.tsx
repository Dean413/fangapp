"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "@/lib/store/toastStore";
import { Button } from "../Button";
import OTPInput from "../otp";
import { useTwoFactorStore } from "@/lib/store/twoFactorStore";
import { useAuthStore } from "@/lib/store/authStore";
import { useTranslations } from "next-intl";

// The OTP box shows this message in green; any other message in red
const CODE_SENT = "New code sent";

const maskEmail = (email: string) => {
    const [name, domain] = email.split("@");
    if (!name || !domain) return email;
    return `${name.slice(0, 2)}${"*".repeat(Math.max(name.length - 2, 3))}@${domain}`;
};

// Two-factor sign-in: after the right password, the reader enters the code sent to their email
export default function TwoFactorCard() {
    const email = useTwoFactorStore((s) => s.email);
    const close = useTwoFactorStore((s) => s.close);
    const t = useTranslations("Auth");
    const c = useTranslations("Common");
    const [otp, setOtp] = useState("");
    const [otpMessage, setOtpMessage] = useState("");
    const [verifying, setVerifying] = useState(false);
    const verifyBusy = useRef(false);
    const sendBusy = useRef(false);
    const lastAutoCode = useRef("");

    useEffect(() => {
        setOtp("");
        setOtpMessage("");
        lastAutoCode.current = "";
        document.body.style.overflow = email ? "hidden" : "auto";
        return () => { document.body.style.overflow = "auto"; };
    }, [email]);

    const verify = async () => {
        if (!email || verifyBusy.current || otp.length !== 6) return;
        verifyBusy.current = true;
        setVerifying(true);
        try {
            const res = await fetch("/api/auth/verify-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email, code: otp }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setOtpMessage(data.message || t("codeIncorrect"));
                return;
            }
            await useAuthStore.getState().fetchUser();
            toast.success(t("signedIn"));
            close();
        } catch {
            setOtpMessage(t("couldntVerify"));
        } finally {
            verifyBusy.current = false;
            setVerifying(false);
        }
    };

    // Verify by itself once all 6 digits are in; each code is sent once
    useEffect(() => {
        if (otp.length < 6) {
            lastAutoCode.current = "";
            return;
        }
        if (verifying || otp === lastAutoCode.current) return;
        lastAutoCode.current = otp;
        verify();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [otp, verifying]);

    const resend = async () => {
        if (!email || sendBusy.current) return;
        sendBusy.current = true;
        setOtp("");
        setOtpMessage("");
        try {
            const res = await fetch("/api/auth/login-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email }),
            });
            const data = await res.json().catch(() => ({}));
            setOtpMessage(res.ok ? CODE_SENT : data.message || t("couldntResend"));
        } catch {
            setOtpMessage(t("couldntResend"));
        } finally {
            sendBusy.current = false;
        }
    };

    if (!email) return null;

    return (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
            <div className="w-full max-w-128.75 relative max-h-[85vh] sm:max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl shadow-2xl no-scrollbar animate-in fade-in zoom-in duration-300">
                <button type="button" onClick={close} className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition">
                    <X size={18} />
                </button>
                <div className="w-full px-6 md:px-16 sm:px-6 py-5 sm:py-6">
                    <div className="flex items-center gap-2 mb-4 sm:mb-5">
                        <Image src="/fang_pictures/fang_logo2.png" alt="logo" width={42} height={42} />
                        <Image src="/fang_pictures/fang_logo1.png" alt="logo text" width={110} height={110} />
                    </div>
                    <div className="mb-4 sm:mb-6">
                        <h2 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">{t("twoFactorTitle")}</h2>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            <span className="block">{t("codeSentTo", { email: maskEmail(email) })}</span>
                            <span className="block text-sm mt-2">{t("twoFactorText")}</span>
                        </p>
                    </div>
                    <div className="space-y-4 sm:space-y-5">
                        <OTPInput length={6} onChange={setOtp} value={otp} resend={resend} errorMessage={otpMessage} />
                        <Button onClick={verify} disabled={verifying || otp.length !== 6} loading={verifying} loadingText={c("verifying")} label={t("signIn")} />
                    </div>
                </div>
            </div>
        </div>
    );
}