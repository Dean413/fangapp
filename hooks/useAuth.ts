"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/store/toastStore";
import { useAuthModals } from "@/lib/store/auth-card-store";
import { useAuthStore } from "@/lib/store/authStore";
import { useTranslations } from "next-intl";

// The OTP box shows this message in green; any other message in red
const CODE_SENT = "New code sent";

export const useAuth = (open: boolean) => {
    const t = useTranslations("Auth");
    const c = useTranslations("Common");
    const [currentStep, setCurrentStep] = useState(1);
    const [showPassword, setShowPassword] = useState(false);
    const [fullName, setFullName] = useState("");
    const [userName, setUserName] = useState("")
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [image, setImage] = useState<string | null>(null);
    const [agreed, setAgreed] = useState(false);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [otp, setOtp] = useState("");
    const [otpMessage, setOtpMessage] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [bio, setBio] = useState("");
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [savingProfile, setSavingProfile] = useState(false);
    const [resending, setResending] = useState(false);
    const sendBusy = useRef(false);
    const verifyBusy = useRef(false);
    const profileBusy = useRef(false);
    const verifyEmail = useAuthModals((s) => s.verifyEmail);

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

    useEffect(() => {
        if (!open) {
            setCurrentStep(1);
            setOtp("");
            setOtpMessage("");
            setMessage("");
        }
    }, [open]);

    // Sign-in found an unconfirmed email: go straight to the code step for that email
    useEffect(() => {
        if (open && verifyEmail) {
            setEmail(verifyEmail);
            setOtp("");
            setOtpMessage("");
            setCurrentStep(2);
        }
    }, [open, verifyEmail]);

    const hasLetters = /[a-zA-Z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);

    const getPasswordStrength = () => {
        if (password.length === 0) {
            return {
                score: 0,
                label: "",
                message: ""
            };
        }

        if (password.length < 5) {
            return {
                score: 1,
                label: t("strengthVeryWeak"),
                message: t("strengthMin5")
            };
        }

        if (password.length < 8) {
            return {
                score: 2,
                label: t("strengthFair"),
                message: ""
            };
        }

        if (password.length >= 10 && hasLetters && hasNumbers) {
            return {
                score: 4,
                label: t("strengthStrong"),
                message: ""
            };
        }

        return {
            score: 3,
            label: t("strengthGood"),
            message: t("strengthAddMix")
        };
    };

    const strength = getPasswordStrength();

    const canCreateAccount = Boolean(
        password.length >= 10 &&
        hasLetters &&
        hasNumbers &&
        fullName.trim() &&
        email.trim()
    );

    // Resend: one request at a time, however many times it's clicked
    const resendCode = async () => {
        if (sendBusy.current) return;
        sendBusy.current = true;
        setResending(true);
        setOtp("");
        setOtpMessage("");
        try {
            const res = await fetch("/api/auth/resend-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email })
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setOtpMessage(data.message || t("couldntResend"));
                return;
            }

            setOtpMessage(CODE_SENT);
        } catch {
            setOtpMessage(t("couldntResend"));
        } finally {
            sendBusy.current = false;
            setResending(false);
        }
    };

    const verifyCode = async () => {
        if (verifyBusy.current || otp.length !== 6) return;
        verifyBusy.current = true;
        setVerifying(true);

        try {
            const res = await fetch("/api/auth/verify-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email, code: otp })
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setOtpMessage(data.message || t("codeIncorrect"));
                return;
            }

            // Signed in from here on (and the 50 bonus coins are in the wallet)
            await useAuthStore.getState().fetchUser();
            toast.success(t("verified"));
            setOtpMessage("");
            setCurrentStep(3);
        } catch {
            setOtpMessage(t("couldntVerify"));
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

    const nextStep = async () => {
        if (!canCreateAccount || sendBusy.current) return;
        if (!agreed) {
            setMessage(t("mustAgree"));
            return;
        }
        setMessage("");
        sendBusy.current = true;
        try {
            setLoading(true);
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ fullName, email, password })
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                toast.error(data.message || t("cantCreateAccount"));
                return;
            }

            if (data.email) setEmail(data.email);
            setOtp("");
            setOtpMessage("");
            toast.success(t("codeSent"))
            setCurrentStep(2);
        } catch {
            toast.error(c("networkError"));
        } finally {
            sendBusy.current = false;
            setLoading(false);
        }
    };

    // Step 3: save the photo, username, About you and favourite genres, then show the success card
    const finalStep = async () => {
        if (profileBusy.current) return;
        const name = userName.trim();
        if (!/^[A-Za-z0-9_]{3,20}$/.test(name)) {
            toast.error(t("usernameRule"));
            return;
        }
        if (bio.trim().length > 300) {
            toast.error(t("bioMax", { max: 300 }));
            return;
        }

        profileBusy.current = true;
        setSavingProfile(true);
        try {
            // The cropped photo, if one was chosen (the picker gives it as an image data URL)
            if (image && image.startsWith("data:image/")) {
                const photo = await fetch("/api/auth/avatar", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ image }),
                });
                const photoData = await photo.json().catch(() => ({}));
                if (!photo.ok) {
                    toast.error(photoData.message || t("couldntSavePhoto"));
                    return;
                }
                setImage(photoData.avatar_url ?? null);
            }

            const res = await fetch("/api/auth/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ username: name, bio, genreIds: selectedGenres }),
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                toast.error(data.message || t("couldntSaveProfile"));
                return;
            }

            await useAuthStore.getState().fetchUser();
            setCurrentStep(4)
        } catch {
            toast.error(c("networkError"));
        } finally {
            profileBusy.current = false;
            setSavingProfile(false);
        }
    }

    const prevStep = () => {
        setOtp("")
        setOtpMessage("")
        setCurrentStep(1)
    };

    return {
        currentStep,
        setCurrentStep,

        showPassword,
        setShowPassword,

        fullName,
        setFullName,

        userName,
        setUserName,

        email,
        setEmail,

        password,
        setPassword,

        agreed,
        setAgreed,

        image,
        setImage,

        bio,
        setBio,

        selectedGenres,
        setSelectedGenres,

        savingProfile,

        message,
        loading,

        otp,
        setOtp,

        verifying,
        setVerifying,

        otpMessage,

        strength,
        canCreateAccount,

        nextStep,
        prevStep,
        resendCode,
        resending,
        verifyCode,
        finalStep

    };
};