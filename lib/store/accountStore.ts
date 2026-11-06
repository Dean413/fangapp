// lib/store/accountStatusStore.ts
// The signed-in reader's suspension state, filled in by AccountGate and read by every SuspensionNotice,
// so the status is only fetched once.
import { create } from "zustand";

export type AccountState = {
    status: "active" | "suspended" | "banned" | "deleted" | null;
    suspendedUntil: string | null;
    reason: string | null;
};

type AccountStatusStore = {
    state: AccountState | null;
    setState: (state: AccountState | null) => void;
};

export const useAccountStatus = create<AccountStatusStore>((set) => ({
    state: null,
    setState: (state) => set({ state }),
}));