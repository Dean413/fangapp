"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { startUnreadPolling, useNotificationStore } from "@/lib/store/notificationStore";

const NOTIFICATIONS_PATH = "/profile/notifications";

// Red pill with the number of unread notifications ("9+" above 9). Shows nothing when signed out,
// when there's nothing unread, or while the reader is on the notifications page.
export default function UnreadBadge({ className = "" }: { className?: string }) {
    const userId = useAuthStore((s) => s.user?.id);
    const count = useNotificationStore((s) => s.count);
    const pathname = usePathname() ?? "";
    const onPage = pathname.includes(NOTIFICATIONS_PATH);
    const wasOnPage = useRef(onPage);

    useEffect(() => {
        if (!userId) {
            useNotificationStore.getState().reset();
            return;
        }
        return startUnreadPolling();
    }, [userId]);

    // Leaving the notifications page marks what was shown as read: ask for the new count just after
    useEffect(() => {
        const left = wasOnPage.current && !onPage;
        wasOnPage.current = onPage;
        if (!left || !userId) return;
        const t = setTimeout(() => useNotificationStore.getState().refresh(), 1500);
        return () => clearTimeout(t);
    }, [onPage, userId]);

    if (!userId || onPage || count <= 0) return null;
    return (
        <span className={`min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold leading-none flex items-center justify-center ${className}`}>
            {count > 9 ? "9+" : count}
        </span>
    );
}