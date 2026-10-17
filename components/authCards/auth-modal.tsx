"use client";

import { useAuthModals } from "@/lib/store/auth-card-store";
import SignInCard from "./sign-in-card";
import RegistrationCard from "./registration-card";
import ForgotPassword from "./forgot-password";

export default function ModalRoot() {
    const { signInOpen, signUpOpen, forgotPasswordOpen, openSignIn, openSignUp, openForgotPassword, closeAll, } = useAuthModals();

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