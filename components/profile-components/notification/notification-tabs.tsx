"use client";

import { useTranslations } from "next-intl";

interface Props {
    active: string;
    setActive: (tab: string) => void;
}

export default function NotificationTabs({ active, setActive }: Props) {
    const tabs = ["All", "Unread", "Mentions", "Transactions"];
    const t = useTranslations("Notifications");

    return (
        <div className="flex gap-2">
            {tabs.map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActive(tab)}
                    className={`px-3 md:px-4 py-2 rounded-full text-xs md:text-sm transition
                    ${active === tab
                            ? "bg-red-500 text-white"
                            : "bg-gray-100 dark:bg-dark-raised text-gray-700 dark:text-neutral-200 hover:bg-gray-200 dark:hover:bg-neutral-800"
                        }`}
                >
                    {t(`tab_${tab}`)}
                </button>
            ))}
        </div>
    );
}