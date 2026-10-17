import { create } from "zustand";

export type Wallet = {
    coins: number;       // bought with money
    bonusCoins: number;  // bonus + VIP bonus, not expired
    gems: number;
    nextExpiry: string | null;
};

type User = {
    id: string;
    full_name: string;
    email: string;
    role?: string;
    public_id?: string | null;
    username?: string | null;
    bio?: string | null;
    avatar_url?: string | null;
    cover_url?: string | null;
    genre_ids?: string[];
    joined_at?: string | null;
    wallet?: Wallet;
} | null;

type AuthState = {
    user: User;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    setUser: (user: User) => void;
    fetchUser: () => Promise<void>;
    logout: () => Promise<boolean>;
};

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    loading: true,

    setUser: (user) => set({ user }),
    setLoading: (loading) => set({ loading }),

    fetchUser: async () => {
        try {
            set({ loading: true });

            const res = await fetch("/api/auth/user", {
                credentials: "include",
                cache: "no-store",
            });

            if (!res.ok) {
                set({ user: null });
                return;
            }

            const data = await res.json();
            set({ user: data.user || null });
        } catch {
            set({ user: null });
        } finally {
            set({ loading: false });
        }
    },

    // Signs out, then asks the server who is signed in, so the page never shows "logged out" when the server
    // still has the login. Returns false if signing out didn't work.
    logout: async () => {
        set({ loading: true });

        let ok = false;
        try {
            const res = await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include",
                cache: "no-store",
            });
            ok = res.ok;
            if (!ok) console.error("Logout failed:", res.status);
        } catch (err) {
            console.error("Logout failed:", err);
        }

        try {
            const check = await fetch("/api/auth/user", { credentials: "include", cache: "no-store" });
            const data = check.ok ? await check.json() : null;
            set({ user: data?.user || null });
            if (data?.user) ok = false;
        } catch {
            set({ user: null });
        } finally {
            set({ loading: false });
        }
        return ok;
    },
}));