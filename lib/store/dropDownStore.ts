import { create } from "zustand";

type dropDownState = {
    isDropDownOpen: boolean;
    openDropDown: () => void;
    closeDropDown: () => void;
    toggleDropDown: () => void;
}

export const useDropDownStore = create<dropDownState>((set) => ({
    isDropDownOpen: false,
    openDropDown: () => set({ isDropDownOpen: true }),
    closeDropDown: () => set({ isDropDownOpen: false }),
    toggleDropDown: () => set((state) => ({ isDropDownOpen: !state.isDropDownOpen })),
}))