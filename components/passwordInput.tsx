"use client";

import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";

type PasswordInputProps = {
    value: string;
    placeholder: string;
    label: string
    onChange: (value: string) => void;
    showStrengthBar: boolean;
    show: boolean;
    setShow: (value: boolean) => void;
    strength?: {
        score: number;
        label: string;
        message: string;
    };
};

export default function PasswordInput({
    value,
    onChange,
    show,
    label,
    placeholder,
    setShow,
    strength,
    showStrengthBar
}: PasswordInputProps) {
    return (
        <div>
            <label className="block text-sm mb-2 font-medium">{label}</label>

            {/* INPUT */}
            <div className="flex items-center bg-gray-100 border  border-gray-300 dark:bg-dark-raised dark:border-neutral-700  rounded-2xl px-4 focus-within:border-red-500">
                <input
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full py-3 bg-transparent outline-none"
                />

                <button type="button" onClick={() => setShow(!show)}>
                    {show ? (
                        <FaRegEyeSlash className="text-gray-400 dark:text-neutral-500" />
                    ) : (
                        <FaRegEye className="text-gray-400 dark:text-neutral-500" />
                    )}
                </button>

            </div>





            {showStrengthBar && (
                strength && (
                    <>
                        <div className="flex gap-2 mt-2">
                            {[1, 2, 3, 4].map((level) => (
                                <div
                                    key={level}
                                    className={`h-1 flex-1 rounded-full transition-all duration-300
              ${strength.score >= level
                                            ? strength.score <= 1
                                                ? "bg-red-500"
                                                : strength.score === 2
                                                    ? "bg-yellow-500"
                                                    : "bg-green-500"
                                            : "bg-gray-300 dark:bg-neutral-700"
                                        }`}
                                />
                            ))}
                        </div>


                        <p className="text-xs mt-1 text-gray-500 dark:text-neutral-400">{strength.label}</p>
                        <p className="text-xs text-gray-400 dark:text-neutral-500">{strength.message}</p>
                    </>
                )
            )}

        </div>
    );
}