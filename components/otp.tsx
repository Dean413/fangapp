"use client";

import { useEffect, useRef, useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";

type OTPProps = {
    value?: string;
    errorMessage: string;
    length?: number;
    resend: () => void;
    onChange: (code: string) => void;
};

// The hooks send this exact text after a new code goes out; it shows in green, any other message in red
const CODE_SENT = "New code sent";

const OTPInput = ({ length = 6, onChange, value, errorMessage, resend, }: OTPProps) => {
    const [countDown, setCountDown] = useState(60);
    const [otp, setOtp] = useState<string[]>(Array(length).fill(""));
    const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
    const isError = Boolean(errorMessage) && errorMessage !== CODE_SENT;

    useEffect(() => {
        if (countDown <= 0) return;

        const timer = setTimeout(() => {
            setCountDown((prev) => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [countDown]);

    // When the page clears the code (new code sent, back a step), clear the boxes too
    useEffect(() => {
        if (value === "") setOtp(Array(length).fill(""));
    }, [value, length]);

    const handleOtpChange = (value: string, index: number) => {

        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);

        setOtp(newOtp);

        onChange(newOtp.join(""));

        if (value && index < length - 1) {
            inputsRef.current[index + 1]?.focus();
        }
    };

    const handleBackspacePress = (index: number) => {
        if (!otp[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {

        e.preventDefault();
        const data = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
        const arr = data.split("");
        const updated = [...otp];

        arr.forEach((num, i) => {
            updated[i] = num;
        });
        setOtp(updated);
        onChange(updated.join(""));
        inputsRef.current[Math.min(arr.length, length - 1)]?.focus();
    };

    const handleResendClick = () => {
        setCountDown(60);
        setOtp(Array(length).fill(""));
        onChange(""); // clear the page's copy too, so the old code can't be sent
        resend();
        inputsRef.current[0]?.focus();
    };

    return (
        <div className="flex flex-col px-4 items-center gap-4">
            <div className="flex  gap-2">
                {otp.map((digit, index) => (
                    <input
                        key={index}
                        ref={(el) => { inputsRef.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        autoComplete={index === 0 ? "one-time-code" : "off"}
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) =>
                            handleOtpChange(e.target.value, index)
                        }
                        onKeyDown={(e) => {
                            if (e.key === "Backspace") { handleBackspacePress(index); }
                        }}
                        onPaste={handlePaste} className={`w-10 h-10 md:w-12 md:h-12 text-center text-lg border rounded-xl outline-none transition
                        ${isError ? "border-red-500 ring-1 ring-red-400" : "border-gray-300 dark:border-neutral-700 focus:border-red-500"}`}
                    />
                ))}
            </div>

            <div className="text-sm text-gray-500 dark:text-neutral-400">
                {errorMessage && (
                    <div className={`flex items-center justify-center gap-2 py-2 px-4 mb-4 rounded-lg w-full
                        ${isError ? "text-red-500 bg-red-200 dark:bg-red-500/25" : "text-green-500 bg-green-200 dark:bg-green-500/25"}`}>
                        {isError ? <CircleAlert size={18} /> : <CircleCheck size={18} />}
                        <p>{errorMessage}</p>
                    </div>
                )}
                {countDown > 0 ? (
                    <p className="text-center">Didn’t receive it?{" "} <span className="text-[#8B0000] dark:text-red-400">
                        Resend code in {countDown}s
                    </span>
                    </p>
                ) : (
                    <div className="flex justify-center">
                        <button type="button" onClick={handleResendClick} className="text-[#8B0000] dark:text-red-400 font-bold">
                            Resend Code
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OTPInput;