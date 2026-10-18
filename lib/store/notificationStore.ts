import { create } from "zustand";

// The number of unread notifications (for the red badges). One shared count for every badge on the page;
// it's asked for once a minute while the tab is open, and again when the reader comes back to the tab.
type NotificationState = {
    count: number;
    refresh: () => Promise<void>;
    reset: () => void;
};

let inflight = false;

export const useNotificationStore = create<NotificationState>((set) => ({
    count: 0,
    refresh: async () => {
        if (inflight) return;
        inflight = true;
        try {
            const res = await fetch("/api/notifications/unread", { credentials: "include", cache: "no-store" });
            if (res.ok) {
                const data = await res.json().catch(() => ({}));
                set({ count: Math.max(0, Number(data.count) || 0) });
            } else if (res.status === 401) {
                set({ count: 0 });
            }
        } catch {
            // keep the last count
        } finally {
            inflight = false;
        }
    },
    reset: () => set({ count: 0 }),
}));

const POLL_MS = 60000;
let users = 0;
let timer: ReturnType<typeof setInterval> | null = null;

const refreshIfVisible = () => {
    if (document.visibilityState === "visible") useNotificationStore.getState().refresh();
};

// Starts asking for the count (once for all badges); returns the function that stops it
export function startUnreadPolling() {
    users += 1;
    if (users === 1) {
        useNotificationStore.getState().refresh();
        timer = setInterval(refreshIfVisible, POLL_MS);
        document.addEventListener("visibilitychange", refreshIfVisible);
    }
    return () => {
        users = Math.max(0, users - 1);
        if (users === 0) {
            if (timer) clearInterval(timer);
            timer = null;
            document.removeEventListener("visibilitychange", refreshIfVisible);
        }
    };
}