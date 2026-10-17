

import Link from "next/link";
import { Button } from "../Button";

type AuthFooterProps = {
    agreed?: boolean;
    forgotPassWord: boolean
    forgotPasswordButtonText?: string;
    forgotPasswordButtonAction?: () => void
    remember?: boolean;
    setRemember?: (value: boolean) => void;
    setAgreed?: (value: boolean) => void;
    paragraphText: string;
    showTerms?: boolean;
    buttonAction: () => void;
    loadingText: string;
    message?: string;
    button: boolean;
    signInButton: boolean
    loading?: boolean;
    buttonLabel: string;
    onSubmit: () => void;
    canCreateAccount?: boolean;
    buttonText?: string;

};

const AuthFooter = ({
    agreed,
    remember,
    setRemember,
    button,
    canCreateAccount,
    setAgreed,
    forgotPassWord,
    showTerms = false,
    message,
    buttonAction,
    loading,
    buttonLabel,
    forgotPasswordButtonAction,
    forgotPasswordButtonText,
    onSubmit,
    buttonText,
    signInButton,
    paragraphText,
    loadingText
}: AuthFooterProps) => {
    return (
        <div className="space-y-3">
            {/* TERMS (optional) */}
            {(showTerms && setAgreed || signInButton) && (
                <label className="flex items-center gap-2 mt-4 text-sm text-gray-600 dark:text-neutral-300">
                    {signInButton ? (
                        <div>
                            <input
                                type="checkbox"
                                checked={remember}
                                onChange={(e) => setRemember?.(e.target.checked)}
                                className="w-4 h-4 accent-red-600"
                            />
                        </div>

                    ) : (
                        <input
                            type="checkbox"
                            checked={agreed}
                            onChange={(e) => setAgreed?.(e.target.checked)}
                            className="w-4 h-4 accent-red-600"
                        />
                    )}

                    {signInButton ? (
                        <p>Remember me</p>
                    ) : (
                        <p className="text-xs">
                            I agree to the{" "}
                            <span className="text-red-600">Terms of Service</span> and{" "}
                            <span className="text-red-600">Privacy Policy</span>
                        </p>
                    )
                    }
                </label>
            )}

            {/* ERROR MESSAGE */}
            {message && <p className="text-xs text-red-500">{message}</p>}

            {button && (
                <Button
                    disabled={loading || !canCreateAccount}
                    onClick={onSubmit}
                    loading={loading}
                    label={buttonLabel}
                    loadingText={loadingText}
                />
            )}

            {signInButton && (
                <Button
                    disabled={loading}
                    onClick={onSubmit}
                    loading={loading}
                    label={buttonLabel}
                    loadingText="Signing in..."
                />
            )}

            {/* LINK */}
            {buttonText && buttonAction && (
                <div className="flex gap-1 justify-center">
                    <p className="text-sm text-gray-600 dark:text-neutral-300">{paragraphText}</p>
                    <button onClick={buttonAction} className="text-red-800 dark:text-red-300 text-sm cursor-pointer">
                        {buttonText}
                    </button>
                </div>
            )}
            {forgotPassWord && (
                <div className="flex justify-center">
                    <p onClick={forgotPasswordButtonAction} className="text-sm cursor-pointer text-center  text-red-800 dark:text-red-300">{forgotPasswordButtonText}</p>
                </div>

            )}
            <div className="bg-gray-100 dark:bg-dark-raised text-gray-500 dark:text-neutral-400 text-xs rounded-2xl mt-2 p-6">
                <h1 className="font-bold mb-2 ml-4 text-black dark:text-white">New Reader Benefits</h1>
                <p className="font-extralight">Sign up today and get <span className="text-red-900 dark:text-red-300 font-bold">50 free coins</span> to unlock premium chapters. No credit card needed.</p>
            </div>
        </div>
    );
};

export default AuthFooter;