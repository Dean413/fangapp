import { create } from "zustand";

type Kind = "success" | "error" | "info";

type ToastState = { message: string; kind: Kind; open: boolean };

export const useToastStore = create<ToastState>(() => ({
    message: "",
    kind: "info",
    open: false,
}));

const DURATION = 3000;
let timer: ReturnType<typeof setTimeout> | undefined;

function show(message: string, kind: Kind) {
    if (timer) clearTimeout(timer);
    useToastStore.setState({ message, kind, open: true });
    timer = setTimeout(() => useToastStore.setState({ open: false }), DURATION);
}

export const toast = Object.assign((message: string) => show(message, "info"), {
    success: (message: string) => show(message, "success"),
    error: (message: string) => show(message, "error"),
    info: (message: string) => show(message, "info"),
});