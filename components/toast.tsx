"use client";

import { useToastStore } from "@/lib/store/toastStore";

export default function ToastHost() {
    const { message, kind, open } = useToastStore();

    return (
        <div
            aria-live="polite"
            className="pointer-events-none fixed inset-0 z-100 flex items-center justify-center px-4"
        >
            <div
                className={`max-w-sm rounded-lg bg-neutral-800/95 px-4 py-2.5 text-center text-sm shadow-lg transition-all duration-300 ${kind === "error" ? "text-red-300" : "text-white"
                    } ${open ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
            >
                {message}
            </div>
        </div>
    );
}