"use client";

import { useState } from "react";

type BioFieldProps = {
    label: string;
    value?: string;                     // the text, when the page keeps it (sign-up, Edit Profile)
    onChange?: (value: string) => void;
};

export default function BioField({ label, value, onChange }: BioFieldProps) {
    // Used only when the page doesn't pass value/onChange
    const [ownBio, setOwnBio] = useState("");
    const bio = value ?? ownBio;

    const handleChange = (text: string) => {
        if (onChange) onChange(text);
        else setOwnBio(text);
    };

    return (
        <div className="flex flex-col gap-2 w-full">
            <label className="text-sm font-medium text-gray-700 dark:text-neutral-200">
                {label}
            </label>

            <div className="relative">
                <textarea
                    value={bio}
                    maxLength={200}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder="Tell us about yourself..."
                    className="w-full h-32 p-4 rounded-xl overflow-auto no-scrollbar bg-gray-200 dark:bg-dark-raised border border-gray-200 dark:border-neutral-700
                    text-gray-900 dark:text-white
                    outline-none resize-none
                    focus:ring-1 focus:ring-red-900 focus:border-red-900
                    transition"
                />
                <div className="absolute bottom-2 right-3 text-xs text-gray-400 dark:text-neutral-500">
                    {bio.length}/200
                </div>
            </div>
        </div>
    );
}