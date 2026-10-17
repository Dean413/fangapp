"use client";

import { Search } from "lucide-react";

type SearchBarProps = {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
};

export default function SearchBar({
    value,
    onChange,
    placeholder = "Search...",
}: SearchBarProps) {
    return (
        <div className="w-full relative">
            <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-600"
            />

            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className=" w-full h-10 pl-11 pr-4 rounded-full bg-gray-100 dark:bg-neutral-200 border border-gray-200 dark:border-transparent
                text-gray-900 placeholder:text-gray-400 dark:placeholder:text-neutral-500 outline-none focus:ring-2 focus:ring-red-700 transition"
            />
        </div>
    );
}