import Image from "next/image"
import { FaFacebookF } from "react-icons/fa"
import Input from "./input";
import PasswordInput from "./passwordInput";
import { useTranslations } from "next-intl";
import { startAppleSignIn } from "@/app/api/auth/apple/apple-client";

type Form = {
    strength?: {
        score: number;
        label: string;
        message: string;
    };
    label: string;
    placeholder: string;
    showStrengthBar: boolean
    fullName?: string;
    setFullName?: (value: string) => void
    email: string;
    setEmail: (value: string) => void
    passWord: string
    setPassword: (value: string) => void
    showPassword: boolean;
    setShowPassword: (value: boolean) => void
    showNameField?: boolean;
}

// Google/Facebook sign-in leaves the site and comes back to the page the reader is on now
const startSocialSignIn = (provider: "google" | "facebook") => {
    const here = window.location.pathname + window.location.search;
    window.location.href = `/api/auth/${provider}/login?next=${encodeURIComponent(here)}`;
};

const ReusableInput = ({ fullName, placeholder, label, showStrengthBar, email, showNameField, passWord, setEmail, setPassword, setShowPassword, showPassword, setFullName, strength }: Form) => {
    const t = useTranslations("Auth");
    return (
        <div className="mx-auto ">
            <div className="flex dark:text-white gap-4">
                <button
                    type="button"
                    onClick={() => startSocialSignIn("google")}
                    className=" border bg-gray-100 dark:bg-dark-raised border-gray-300 dark:border-neutral-700 rounded-3xl py-3 px-4 md:px-4 flex items-center justify-center md:gap-3 gap-1 hover:bg-gray-50 dark:hover:bg-neutral-800 transition cursor-pointer"
                >
                    <Image src="https://www.svgrepo.com/show/355037/google.svg" alt="Google" width={20} height={20} className="w-5" />
                    <span className="font-medium md:text-sm text-xs">Google</span>
                </button>

                <button
                    type="button"
                    onClick={() => startSocialSignIn("facebook")}
                    className=" border bg-gray-100 dark:bg-dark-raised border-gray-300 dark:border-neutral-700 rounded-3xl py-3 px-4 flex items-center justify-center md:gap-3 gap-1 hover:bg-gray-50 dark:hover:bg-neutral-800 transition cursor-pointer">
                    <div className="w-5 h-5 rounded-full bg-[#1877F2] flex items-center justify-center text-white">
                        <FaFacebookF size={11} />
                    </div>
                    <span className="font-medium md:text-sm text-xs">Facebook</span>
                </button>

                <button type="button" onClick={() => startAppleSignIn(window.location.pathname + window.location.search)} className=" border bg-gray-100 dark:bg-dark-raised border-gray-300 dark:border-neutral-700 rounded-3xl py-3 px-4 flex items-center justify-center md:gap-3 gap-1 hover:bg-gray-50 dark:hover:bg-neutral-800 transition cursor-pointer">
                    <Image src="https://www.svgrepo.com/show/503173/apple-logo.svg" alt="apple-logo" width={20} height={20} />
                    <span className="font-medium md:text-sm text-xs">Apple</span>
                </button>
            </div>

            {/* DIVIDER */}
            <div className="flex items-center gap-3 my-5">
                <div className="grow h-px bg-gray-300 dark:bg-neutral-800"></div>
                <span className="text-xs text-gray-500 dark:text-neutral-400">or</span>
                <div className="grow h-px bg-gray-300 dark:bg-neutral-800"></div>
            </div>

            {/* FORM */}
            <div className="space-y-4">
                {showNameField && (<Input value={fullName || ""} onChange={(value) => setFullName?.(value)} label={t("fullName")} placeholder={t("fullNamePlaceholder")} />)}
                <Input label={t("email")} placeholder={t("emailPlaceholder")} value={email || ""} onChange={setEmail} />
                <PasswordInput
                    showStrengthBar={showStrengthBar}
                    value={passWord}
                    onChange={setPassword}
                    show={showPassword}
                    setShow={setShowPassword}
                    strength={strength}
                    label={label}
                    placeholder={placeholder}
                />
            </div>
        </div>
    )
}

export default ReusableInput