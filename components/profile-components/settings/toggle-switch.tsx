"use client";

interface Props {
    enabled: boolean;
    onChange: () => void;
}

export default function ToggleSwitch({
    enabled,
    onChange
}: Props) {
    return (
        <button
            onClick={onChange}
            className={`w-12 h-6 rounded-full transition relative
            ${enabled ? "bg-red-500" : "bg-gray-300 dark:bg-neutral-700"}`}
        >
            <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition
                ${enabled ? "left-7" : "left-1"}`}
            />
        </button>
    );
}