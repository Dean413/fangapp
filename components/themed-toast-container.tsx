"use client";

import { ToastContainer } from "react-toastify";
import { useTheme } from "next-themes";

// Toasts follow the site theme (light/dark)
export default function ThemedToastContainer() {
    const { resolvedTheme } = useTheme();

    return (
        <ToastContainer
            position="top-right"
            pauseOnHover
            theme={resolvedTheme === "dark" ? "dark" : "light"}
            autoClose={3000}
            hideProgressBar={false}
        />
    );
}
