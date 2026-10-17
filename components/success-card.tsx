"use client";
import { CircleWavyCheck } from "phosphor-react"

import { CheckCircle } from "lucide-react";

type SuccessCardProps = {
    onDone: () => void;
    head: string;
    text: string
    buttonText: string
};

export default function SuccessCard({ onDone, head, text, buttonText }: SuccessCardProps) {
    return (
        <div className="w-full max-w-md mx-auto">
            <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl shadow-lg p-6 text-center">

                {/* Icon */}
                <div className="flex justify-center mb-4">
                    <div className="bg-green-400 ring-8 ring-green-100 dark:ring-green-500/20 p-3 rounded-full">
                        <CircleWavyCheck className="text-white w-8 h-8" />
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {head}
                </h2>

                {/* Subtitle */}
                <p className="text-sm text-gray-500 dark:text-neutral-400 mt-2">
                    {text}
                </p>

                {/* Button */}
                <button
                    onClick={onDone} className="cursor-pointer mt-6 w-full bg-linear-to-r from-[#8B0000] to-[#D90404] hover:bg-red-700 text-white py-3 rounded-xl font-medium transition">
                    {buttonText}
                </button>
            </div>
        </div>
    );
}