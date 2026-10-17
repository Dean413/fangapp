import { Button } from "../Button"
import Input from "../input"
import Header from "../header-and-logo"
import { ChevronLeft, X } from "lucide-react"
import { useForgotPassWordAuth } from "@/hooks/forgotPasswordAuth"
import OTPInput from "../otp"
import PasswordInput from "../passwordInput"
import SuccessCard from "../success-card"

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
    return (
        <>
            <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className={`relative w-128.75 max-h-[90vh] overflow-auto  ${Auth.currentStep === 4 ? "max-w-0" : "max-w-125"} bg-white dark:bg-dark-card rounded-3xl shadow-2xl no-scrollbar animate-in fade-in zoom-in duration-300`}>
                    <button onClick={onClose} className={`absolute ${(Auth.currentStep === 2 || Auth.currentStep === 3) ? "hidden" : ""} top-5 right-5 p-2 rounded-full  hover:bg-gray-100 dark:hover:bg-dark-raised transition`}>
                        <X size={18} />
                    </button>
                    <div className="w-full px-6 md:px-16 sm:px-6 py-5 sm:py-6">
                        {Auth.currentStep === 1 && (
                            <>
                                <div><Header head="Reset Password" paragraph="Enter the email address linked to your account and we’ll send you a reset code." /></div>
                                <div className="space-y-6">
                                    <Input value={Auth.email} onChange={Auth.setEmail} label="Email" />
                                    <Button label="Send code" onClick={Auth.generateCode} disabled={Auth.loading || !Auth.email.trim()} loading={Auth.loading} loadingText="Sending..." />
                                    <p className="text-center text-gray-600 dark:text-neutral-300">Remember it? <span onClick={openSignInCard} className="text-red-800 dark:text-red-300 cursor-pointer">Sign in</span></p>
                                </div>
                            </>
                        )}

                        {Auth.currentStep === 2 && (
                            <>
                                <button onClick={Auth.PrevStep} className="cursor-pointer w-full items-center flex gap-2 text-left  my-6 text-sm text-gray-500 dark:text-neutral-400"><ChevronLeft size={15} /> Go Back</button>
                                <div>
                                    <Header head="Verify your email" paragraph={`We sent a 6-digit code to ${maskEmail(Auth.email)}. `} />
                                    <p className="text-gray-400 dark:text-neutral-500 mb-4">Enter it below.</p>
                                </div>
                                <div className="space-y-4">
                                    <OTPInput length={6} onChange={Auth.setOtp} value={Auth.otp} resend={Auth.resendCode} errorMessage={Auth.otpMessage} />
                                    <Button onClick={Auth.verifyCode} disabled={Auth.verifying || Auth.resending || Auth.otp.length !== 6} loading={Auth.verifying} loadingText="Verifying..." label="Verify" />
                                </div>
                            </>
                        )}

                        {Auth.currentStep === 3 && (
                            <>
                                <div className="my-6"><Header head="New Password" paragraph="Choose a password you haven't used before." /></div>
                                <div className="space-y-4 mt-8">
                                    <div className="mb-6">
                                        <PasswordInput
                                            value={Auth.passWord}
                                            onChange={Auth.setPassWord}
                                            show={Auth.showPassWord}
                                            setShow={Auth.setShowPassWord}
                                            showStrengthBar={false}
                                            label="New password"
                                            placeholder="Enter new password"
                                        />
                                    </div>

                                    <PasswordInput
                                        value={Auth.confirmPassWord}
                                        onChange={Auth.setConfirmPassword}
                                        show={Auth.showConfirmPassWord}
                                        setShow={Auth.setShowConfirmPassword}
                                        showStrengthBar={false}
                                        label="Confirm password"
                                        placeholder="Confirm password"
                                    />
                                    <div className="my-8"><Button label="Change password" onClick={Auth.changePassWord} disabled={Auth.loading || !Auth.passWord || !Auth.confirmPassWord} loading={Auth.loading} loadingText="Saving..." /></div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                {Auth.currentStep === 4 && (
                    <>
                        <SuccessCard head="Password Updated" text="Your password has been changed successfully" buttonText="Sign in" onDone={openSignInCard} />
                    </>
                )}
            </div>

        </>
    )
}
export default ForgotPassword