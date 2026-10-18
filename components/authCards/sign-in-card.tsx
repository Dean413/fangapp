import { X } from "lucide-react"
import Input from "../input";
import ReusableInput from "../form";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";
import AuthFooter from "./Authfooter";
import { useState } from "react";
import { toast } from "react-toastify";
import { useLoginAuth } from "@/hooks/useLoginAuth";
import Header from "../header-and-logo";
type SignInProps = {
    open: boolean;
    onClose: () => void;
    onOpenSignUp: () => void
    onOpenForgotPassWord: () => void
}
const SignInCard = ({ open, onClose, onOpenSignUp, onOpenForgotPassWord }: SignInProps) => {
    const LoginAuth = useLoginAuth(open)


    return (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
            <div className="w-full max-w-128.75 relative max-h-[85vh] sm:max-h-[90vh] overflow-y-auto bg-white dark:bg-dark-card rounded-2xl sm:rounded-3xl shadow-2xl no-scrollbar animate-in fade-in zoom-in duration-300">
                <button onClick={onClose} className="absolute top-0 right-0 z-0 p-1.5 rounded-full bg-white dark:bg-neutral-800 shadow-md hover:bg-gray-100 dark:hover:bg-neutral-700  
                        transition">
                    <X size={20} />
                </button>
                <div className="w-full px-6 md:px-16 sm:px-6 py-5 sm:py-6">

                    <Header head="Welcome Back" paragraph="Sign in to continue your reading journey" />

                    <div className="space-y-3 sm:space-y-4">
                        <ReusableInput
                            email={LoginAuth.email}
                            setEmail={LoginAuth.setEmail}
                            passWord={LoginAuth.password}
                            setPassword={LoginAuth.setPassword}
                            showPassword={LoginAuth.showPassword}
                            setShowPassword={LoginAuth.setShowPassword}
                            showNameField={false}
                            showStrengthBar={false}
                            label="Password"
                            placeholder="Enter password"

                        />

                        <AuthFooter
                            remember={LoginAuth.remember}
                            setRemember={LoginAuth.setRemember}
                            loading={LoginAuth.loading}
                            loadingText="Signing in...."
                            buttonLabel="Sign in"
                            onSubmit={LoginAuth.signIn}
                            paragraphText="Already have an account?"
                            buttonText="Sign up"
                            buttonAction={onOpenSignUp}
                            button={false}
                            signInButton
                            forgotPassWord
                            forgotPasswordButtonText="Forgot Password?"
                            forgotPasswordButtonAction={onOpenForgotPassWord}
                        />
                    </div>

                </div>


            </div>
        </div>
    )
}

export default SignInCard