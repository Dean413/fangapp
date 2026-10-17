import { create } from "zustand";

type walletAction = {
    active: string
    setActive: (value: string) => void
}

export const useWalletStore = create<walletAction>((set) => ({
    active: "earn",
    setActive: (active) => set({ active }),
}))