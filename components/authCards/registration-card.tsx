"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeft, X } from "lucide-react";
import Link from "next/link";
import { Button } from "../Button";
import OTPInput from "../otp";
import Input from "../input";
import ReusableInput from "../form";
import AuthFooter from "./Authfooter";
import { useAuth } from "@/hooks/useAuth";
import { ProfileImagePicker } from "../imagePicker";
import GenrePicker from "../genreSelectionCard";
import SuccessCard from "../success-card";
import { useTranslations } from "next-intl";

type AuthCardProps = {
    open: boolean;
    onClose: () => void;
    onOpenSignIn: () => void;
};


const steps = [1, 2, 3, 4];

const RegistrationCard = ({ open, onClose, onOpenSignIn }: AuthCardProps) => {
    const Auth = useAuth(open);
    const t = useTranslations("Auth");
    const c = useTranslations("Common");
    if (!open) return null;

    const maskEmail = (email: string) => {
        const [name, domain] = email.split("@");
        if (!name || !domain) return email;
        const visiblePart = name.slice(0, 2);
        const maskedPart = "*".repeat(Math.max(name.length - 2, 3));
        return `${visiblePart}${maskedPart}@${domain}`;
    };

    return (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
            <div className="w-full max-w-128.75 relative max-h-[85vh] sm:max-h-[90vh] overflow-y-auto bg-white dark:bg-dark-card rounded-2xl sm:rounded-3xl shadow-2xl no-scrollbar animate-in fade-in zoom-in duration-300">
                {Auth.currentStep !== 2 && Auth.currentStep !== 4 && (
                    <button onClick={onClose} className="absolute top-0 right-0 z-0 p-1.5 rounded-full bg-white dark:bg-neutral-800 shadow-md hover:bg-gray-100 dark:hover:bg-neutral-700  
                        transition">
                        <X size={20} />
                    </button>
                )}

                {/* CARD */}
                {Auth.currentStep !== 4 && (
                    <div className="w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-dark-card rounded-2xl sm:rounded-3xl shadow-2xl no-scrollbar animate-in fade-in zoom-in duration-300">
                        <div className="w-full px-6 md:px-16 sm:px-6 py-5 sm:py-6">
                            {/* STEP INDICATORS */}
                            <div className="flex items-center justify-center mb-6 sm:mb-8">
                                {steps.map((step, index) => {
                                    const isActive = Auth.currentStep === step;
                                    const isCompleted = Auth.currentStep > step;
                                    return (
                                        <div key={step} className="flex items-center">
                                            <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full border-2 flex items-center justify-center text-xs sm:text-sm font-semibold transition-all duration-300
                                                ${isActive
                                                    ? "border-red-600 text-red-600 bg-red-50 dark:bg-red-500/10 ring-2 ring-red-400/30 animate-soft-ping"
                                                    : isCompleted
                                                        ? "bg-red-600 border-red-600 text-white"
                                                        : "border-gray-300 dark:border-neutral-700 text-gray-400 dark:text-neutral-500"
                                                }`}>
                                                {isCompleted ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                                                        <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.2 7.2a1 1 0 01-1.42 0l-3.2-3.2a1 1 0 011.42-1.42l2.49 2.49 6.49-6.49a1 1 0 011.42 0z" clipRule="evenodd" />
                                                    </svg>
                                                ) : step}
                                            </div>
                                            {/* CONNECTOR LINE */}
                                            {index !== steps.length - 1 && (
                                                <div className={`w-8 sm:w-14 h-0.5 transition-all duration-300 ${Auth.currentStep > step ? "bg-red-600" : "bg-gray-300 dark:bg-neutral-700"}`} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* GO BACK */}
                            {Auth.currentStep === 2 && (
                                <button
                                    onClick={Auth.prevStep}
                                    className="cursor-pointer w-full items-center flex gap-1.5 text-left mb-5 text-xs sm:text-sm text-gray-500 dark:text-neutral-400"
                                >
                                    <ChevronLeft size={14} /> {c("goBack")}
                                </button>
                            )}

                            {/* LOGO */}
                            <div className="flex items-center gap-2 mb-4 sm:mb-5">
                                <Image src="/fang_pictures/fang_logo2.png" alt="logo" width={42} height={42} />
                                <Image src="/fang_pictures/fang_logo1.png" alt="logo text" width={110} height={110} />
                            </div>

                            {/* HEADER */}
                            <div className="mb-4 sm:mb-6">
                                <h2 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">
                                    {Auth.currentStep === 1 && t("createTitle")}
                                    {Auth.currentStep === 2 && t("verifyTitle")}
                                    {Auth.currentStep === 3 && t("profileTitle")}
                                </h2>
                                <p className="text-xs sm:text-sm text-gray-500 dark:text-neutral-400">
                                    {Auth.currentStep === 1 && t("createText")}
                                    {Auth.currentStep === 2 && (
                                        <>
                                            <span className="block">
                                                {t("codeSentTo", { email: maskEmail(Auth.email) })}
                                            </span>
                                            <span className="block text-sm  mt-2">
                                                {t("enterBelow")}
                                            </span>
                                        </>
                                    )}
                                    {Auth.currentStep === 3 && t("profileText")}
                                </p>
                            </div>

                            {/* STEP 1 */}
                            {Auth.currentStep === 1 && (
                                <>
                                    <div className="space-y-3 sm:space-y-4">
                                        <ReusableInput
                                            fullName={Auth.fullName}
                                            setFullName={Auth.setFullName}
                                            email={Auth.email}
                                            setEmail={Auth.setEmail}
                                            passWord={Auth.password}
                                            setPassword={Auth.setPassword}
                                            showPassword={Auth.showPassword}
                                            setShowPassword={Auth.setShowPassword}
                                            strength={Auth.strength}
                                            showNameField
                                            showStrengthBar
                                            placeholder={t("passwordPlaceholder")}
                                            label={t("password")}
                                        />
                                    </div>
                                    <AuthFooter
                                        agreed={Auth.agreed}
                                        setAgreed={Auth.setAgreed}
                                        showTerms={true}
                                        message={Auth.message}
                                        loading={Auth.loading}
                                        canCreateAccount={Auth.canCreateAccount}
                                        loadingText={t("creatingAccount")}
                                        buttonLabel={t("createAccount")}
                                        onSubmit={Auth.nextStep}
                                        paragraphText={t("haveAccount")}
                                        buttonText={t("signIn")}
                                        button
                                        signInButton={false}
                                        buttonAction={onOpenSignIn}
                                        forgotPassWord
                                    />
                                </>
                            )}

                            {/* STEP 2 */}
                            {Auth.currentStep === 2 && (
                                <div className="space-y-4 sm:space-y-5">
                                    <div ><OTPInput length={6} onChange={Auth.setOtp} value={Auth.otp} resend={Auth.resendCode} errorMessage={Auth.otpMessage} /></div>
                                    <Button onClick={Auth.verifyCode} disabled={Auth.verifying || Auth.otp.length !== 6} loading={Auth.verifying} loadingText={c("verifying")} label={c("verify")} />
                                </div>
                            )}

                            {/* STEP 3 */}
                            {Auth.currentStep === 3 && (
                                <div className="space-y-4 sm:space-y-5">
                                    <ProfileImagePicker image={Auth.image} setImage={Auth.setImage} name={Auth.fullName || Auth.userName} uploadIcon={t("uploadPhoto")} pictureHeader={t("profilePhoto")} />
                                    <Input label={t("username")} placeholder={t("usernamePlaceholder")} value={Auth.userName} onChange={Auth.setUserName} />
                                    <h1 className="text-sm sm:text-base font-semibold text-gray-700 dark:text-neutral-300">{t("favouriteGenres")}</h1>
                                    <GenrePicker selected={Auth.selectedGenres} onChange={Auth.setSelectedGenres} bio={Auth.bio} setBio={Auth.setBio} />
                                    <Button onClick={Auth.finalStep} disabled={Auth.savingProfile} loading={Auth.savingProfile} loadingText={c("saving")} label={c("continue")} />
                                </div>
                            )}

                        </div>
                    </div>
                )}
                {/* STEP 4 */}
                {Auth.currentStep === 4 && (
                    <SuccessCard head={t("profileDoneTitle")} text={t("profileDoneText")} buttonText={c("done")} onDone={onClose} />
                )}
            </div>


        </div>
    );
};

export default RegistrationCard;