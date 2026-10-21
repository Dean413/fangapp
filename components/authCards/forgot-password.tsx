import { Button } from "../Button"
import Input from "../input"
import Header from "../header-and-logo"
import { ChevronLeft, X } from "lucide-react"
import { useForgotPassWordAuth } from "@/hooks/forgotPasswordAuth"
import OTPInput from "../otp"
import PasswordInput from "../passwordInput"
import SuccessCard from "../success-card"
import { useTranslations } from "next-intl"

type props = {
    open: boolean
    openSignInCard: () => void
    onClose: () => void
}

// jo*****@gmail.com
const maskEmail = (email: string) => {
    const [name, domain] = email.trim().split("@");
    if (!name || !domain) return email;
    return `${name.slice(0, 2)}${"*".repeat(Math.max(name.length - 2, 3))}@${domain}`;
};

const ForgotPassword = ({ open, onClose, openSignInCard }: props) => {
    const Auth = useForgotPassWordAuth(open)
    const t = useTranslations("Auth")
    const c = useTranslations("Common")
    return (
        <>
            <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div
                    className={`relative w-full max-w-125 max-h-[90vh] overflow-auto ${Auth.currentStep === 4 ? "hidden" : ""
                        } bg-white dark:bg-dark-card rounded-3xl shadow-2xl no-scrollbar animate-in fade-in zoom-in duration-300`}>
                    <button onClick={onClose} className={`absolute ${(Auth.currentStep === 2 || Auth.currentStep === 3) ? "hidden" : ""} top-5 right-5 p-2 rounded-full  hover:bg-gray-100 dark:hover:bg-dark-raised transition`}>
                        <X size={18} />
                    </button>
                    <div className="w-full px-6 md:px-16 sm:px-6 py-5 sm:py-6">
                        {Auth.currentStep === 1 && (
                            <>
                                <div><Header head={t("resetTitle")} paragraph={t("resetText")} /></div>
                                <div className="space-y-6">
                                    <Input value={Auth.email} onChange={Auth.setEmail} label={t("email")} placeholder={t("emailPlaceholder")} />
                                    <Button label={t("sendCode")} onClick={Auth.generateCode} disabled={Auth.loading || !Auth.email.trim()} loading={Auth.loading} loadingText={c("sending")} />
                                    <p className="text-center text-gray-600 dark:text-neutral-300">{t("rememberIt")} <span onClick={openSignInCard} className="text-red-800 dark:text-red-300 cursor-pointer">{t("signIn")}</span></p>
                                </div>
                            </>
                        )}

                        {Auth.currentStep === 2 && (
                            <>
                                <button onClick={Auth.PrevStep} className="cursor-pointer w-full items-center flex gap-2 text-left  my-6 text-sm text-gray-500 dark:text-neutral-400"><ChevronLeft size={15} /> {c("goBack")}</button>
                                <div>
                                    <Header head={t("verifyTitle")} paragraph={t("codeSentTo", { email: maskEmail(Auth.email) })} />
                                    <p className="text-gray-400 dark:text-neutral-500 mb-4">{t("enterBelow")}</p>
                                </div>
                                <div className="space-y-4">
                                    <OTPInput length={6} onChange={Auth.setOtp} value={Auth.otp} resend={Auth.resendCode} errorMessage={Auth.otpMessage} />
                                    <Button onClick={Auth.verifyCode} disabled={Auth.verifying || Auth.resending || Auth.otp.length !== 6} loading={Auth.verifying} loadingText={c("verifying")} label={c("verify")} />
                                </div>
                            </>
                        )}

                        {Auth.currentStep === 3 && (
                            <>
                                <div className="my-6"><Header head={t("newPasswordTitle")} paragraph={t("newPasswordText")} /></div>
                                <div className="space-y-4 mt-8">
                                    <div className="mb-6">
                                        <PasswordInput
                                            value={Auth.passWord}
                                            onChange={Auth.setPassWord}
                                            show={Auth.showPassWord}
                                            setShow={Auth.setShowPassWord}
                                            showStrengthBar={false}
                                            label={t("newPassword")}
                                            placeholder={t("newPasswordPlaceholder")}
                                        />
                                    </div>

                                    <PasswordInput
                                        value={Auth.confirmPassWord}
                                        onChange={Auth.setConfirmPassword}
                                        show={Auth.showConfirmPassWord}
                                        setShow={Auth.setShowConfirmPassword}
                                        showStrengthBar={false}
                                        label={t("confirmPassword")}
                                        placeholder={t("confirmPassword")}
                                    />
                                    <div className="my-8"><Button label={t("changePassword")} onClick={Auth.changePassWord} disabled={Auth.loading || !Auth.passWord || !Auth.confirmPassWord} loading={Auth.loading} loadingText={c("saving")} /></div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                {Auth.currentStep === 4 && (
                    <>
                        <SuccessCard head={t("passwordUpdatedTitle")} text={t("passwordUpdatedText")} buttonText={t("signIn")} onDone={openSignInCard} />
                    </>
                )}
            </div>

        </>
    )
}
export default ForgotPassword