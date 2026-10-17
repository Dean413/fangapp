"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

// The OTP box shows this message in green; any other message in red
const CODE_SENT = "New code sent";

// Step 1: email → step 2: code → step 3: new password → step 4: done
export const useForgotPassWordAuth = (open: boolean) => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("")
    const [passWord, setPassWord] = useState("")
    const [showPassWord, setShowPassWord] = useState(false)
    const [confirmPassWord, setConfirmPassword] = useState("")
    const [showConfirmPassWord, setShowConfirmPassword] = useState(false)
    const [otp, setOtp] = useState("");
    const [otpMessage, setOtpMessage] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [resending, setResending] = useState(false);
    // Blocks a second click before the page has re-drawn (state alone can't catch a fast double-click)
    const busy = useRef(false);
    const verifyBusy = useRef(false);
    const [currentStep, setCurrentStep] = useState(1)

    useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
        return () => {
            document.body.style.overflow = "auto";
        };
    }, [open]);

    // Start over each time the card is closed
    useEffect(() => {
        if (!open) {
            setCurrentStep(1);
            setOtp("");
            setOtpMessage("");
            setPassWord("");
            setConfirmPassword("");
        }
    }, [open]);

    const sendCode = async () => {
        const res = await fetch("/api/auth/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email }),
        });
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, message: data.message as string | undefined };
    };

    // Step 1: email the code
    const generateCode = async () => {
        if (busy.current) return;
        if (!email.trim()) {
            toast.error("Please enter your email");
            return;
        }
        busy.current = true;
        setLoading(true);
        try {
            const result = await sendCode();
            if (!result.ok) {
                toast.error(result.message || "Couldn't send the code");
                return;
            }
            setOtp("");
            setOtpMessage("");
            toast.success("We've sent a code to your email");
            setCurrentStep(2);
        } catch {
            toast.error("Unable to reach the server. Please try again.");
        } finally {
            busy.current = false;
            setLoading(false);
        }
    };

    // Resend: one request at a time, however many times it's clicked
    const resendCode = async () => {
        if (busy.current) return;
        busy.current = true;
        setResending(true);
        setOtp("");
        setOtpMessage("");
        try {
            const result = await sendCode();
            setOtpMessage(result.ok ? CODE_SENT : result.message || "Couldn't send the code");
        } catch {
            setOtpMessage("Couldn't send the code");
        } finally {
            busy.current = false;
            setResending(false);
        }
    };

    // Step 2: check the code
    const verifyCode = async () => {
        if (verifyBusy.current || otp.length !== 6) return;
        verifyBusy.current = true;
        setVerifying(true);

        try {
            const res = await fetch("/api/auth/verify-reset-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email, code: otp }),
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setOtpMessage(data.message || "Oh no! The code you entered is incorrect");
                return;
            }

            toast.success("Verified Successfully");
            setOtpMessage("");
            setCurrentStep(3);
        } catch {
            setOtpMessage("Could not verify the code. Please try again.");
        } finally {
            verifyBusy.current = false;
            setVerifying(false);
        }
    };

    // Verify by itself once all 6 digits are in (typed or pasted); each code is sent once
    const lastAutoCode = useRef("");
    useEffect(() => {
        if (currentStep !== 2) return;
        if (otp.length < 6) {
            lastAutoCode.current = "";
            return;
        }
        if (verifying || otp === lastAutoCode.current) return;
        lastAutoCode.current = otp;
        verifyCode();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [otp, currentStep, verifying]);

    // Step 3: choose the new password
    const changePassWord = async () => {
        if (busy.current) return;
        if (passWord !== confirmPassWord) {
            toast.error("Passwords don't match");
            return;
        }
        if (passWord.length < 10 || !/[a-zA-Z]/.test(passWord) || !/[0-9]/.test(passWord)) {
            toast.error("Password must be at least 10 characters with letters and numbers");
            return;
        }

        busy.current = true;
        setLoading(true);
        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ password: passWord }),
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                toast.error(data.message || "Failed to update password");
                // The one-time reset pass ran out or was used: start over
                if (data.code === "RESET_EXPIRED") {
                    setOtp("");
                    setCurrentStep(1);
                }
                return;
            }

            setPassWord("");
            setConfirmPassword("");
            setCurrentStep(4);
        } catch {
            toast.error("Unable to reach the server. Please try again.");
        } finally {
            busy.current = false;
            setLoading(false);
        }
    };

    const PrevStep = () => {
        setOtp("")
        setOtpMessage("")
        setCurrentStep(1)
    }

    return {
        passWord,
        email,
        verifyCode,
        verifying,
        setVerifying,
        otp,
        setOtp,
        otpMessage,
        setOtpMessage,
        setCurrentStep,
        currentStep,
        setEmail,
        generateCode,
        resendCode,
        resending,
        setPassWord,
        confirmPassWord,
        setConfirmPassword,
        showPassWord,
        setShowPassWord,
        loading,
        changePassWord,
        showConfirmPassWord,
        setShowConfirmPassword,
        setLoading,
        PrevStep
    };
};