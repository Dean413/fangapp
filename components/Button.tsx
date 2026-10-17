import { Loader2 } from "lucide-react";

type ButtonProp = {
    loadingText?: string;
    label?: React.ReactNode;
    disabled?: boolean;
    loading?: boolean;
    className?: string;
    onClick: () => void;
};

export const Button = ({
    label,
    disabled,
    onClick,
    loading,
    loadingText,
    className = ""
}: ButtonProp) => {
    return (
        <div className="flex justify-center">
            <button onClick={onClick} disabled={disabled}
                className={`
                    w-90 flex items-center justify-center gap-2
                    bg-linear-to-r from-[#8B0000] to-[#D90404]
                    hover:opacity-90
                    disabled:opacity-50 disabled:cursor-not-allowed
                    cursor-pointer text-white py-3 rounded-full
                    font-semibold transition
                    ${className}
                `}
            >
                {loading ? (
                    <>
                        <Loader2 className="animate-spin" size={18} />
                        {loadingText}
                    </>
                ) : (
                    label
                )}
            </button>
        </div>
    );
};