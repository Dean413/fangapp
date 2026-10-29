"use client";

import { useEffect, useRef } from "react";
import { useAuthModals } from "@/lib/store/auth-card-store";
import { useAuthStore } from "@/lib/store/authStore";
import SignInCard from "./sign-in-card";
import RegistrationCard from "./registration-card";
import ForgotPassword from "./forgot-password";

export default function ModalRoot() {
    const { signInOpen, signUpOpen, forgotPasswordOpen, openSignIn, openSignUp, openForgotPassword, closeAll, } = useAuthModals();
    const user = useAuthStore((s) => s.user);
    const authLoading = useAuthStore((s) => s.loading);
    const handledRef = useRef(false);

    // A referral link (?ref=CODE): once we know the visitor is logged out, open the sign-up card.
    // The code itself is already saved in the fang_ref cookie, so the param is removed from the address afterwards.
    useEffect(() => {
        if (handledRef.current || authLoading) return;
        const url = new URL(window.location.href);
        if (!url.searchParams.get("ref")) return;
        handledRef.current = true;
        if (!user) openSignUp();
        url.searchParams.delete("ref");
        window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }, [authLoading, user, openSignUp]);

    return (
        <>
            {signInOpen && (
                <SignInCard
                    open={signInOpen}
                    onClose={closeAll}
                    onOpenSignUp={openSignUp}
                    onOpenForgotPassWord={openForgotPassword}
                />
            )}

            {signUpOpen && (
                <RegistrationCard
                    open={signUpOpen}
                    onClose={closeAll}
                    onOpenSignIn={openSignIn}
                />
            )}

            {forgotPasswordOpen && (
                <ForgotPassword
                    open={forgotPasswordOpen}
                    onClose={closeAll}
                    openSignInCard={openSignIn}
                />
            )}
        </>
    );
}