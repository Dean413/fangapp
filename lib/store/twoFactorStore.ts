import { create } from "zustand";

// Two-factor sign-in: the email waiting for its sign-in code (the code card shows while this is set)
type TwoFactorState = {
    email: string | null;
    open: (email: string) => void;
    close: () => void;
};

export const useTwoFactorStore = create<TwoFactorState>((set) => ({
    email: null,
    open: (email) => set({ email }),
    close: () => set({ email: null }),
}));