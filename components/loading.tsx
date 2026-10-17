// components/FullPageLoader.tsx
"use client";

import Image from "next/image";
import { Suspense } from "react";

export default function FullPageLoader({
    text = "",
}: {
    text?: string;
}) {
    return (

        <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm z-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {text}
            </h2>
        </div>
    );
}
