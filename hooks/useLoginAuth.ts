"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useAuthModals } from "@/lib/store/auth-card-store";
import { useAuthStore } from "@/lib/store/authStore";

export const useLoginAuth = (open: boolean) => {
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false)
    const [remember, setRemember] = useState(false)
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    // Blocks a second click before the page has re-drawn (state alone can't catch a fast double-click)
    const busy = useRef(false);
    const closeAll = useAuthModals((s) => s.closeAll);
    const openVerify = useAuthModals((s) => s.openVerify);

    useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }

        return () => {
            document.body.style.overflow = "auto";
        };
    }, [open]);

    const signIn = async () => {
        if (busy.current) return;
        if (!email.trim() || !password) {
            toast.error("Email and password are required");
            return;
        }

        busy.current = true;
        try {
            setLoading(true)
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "content-type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    email,
                    password
                })
            })

            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                // Right password, email never confirmed: a code was just sent; show the code step
                if (data.code === "EMAIL_NOT_VERIFIED") {
                    toast.info(data.message)
                    openVerify(data.email || email.trim().toLowerCase())
                    return
                }
                toast.error(data.message || "Invalid email or password")
                return
            }

            await useAuthStore.getState().fetchUser();
            toast.success(data.message || "Signed in successfully")
            setPassword("")
            closeAll()
        } catch {
            toast.error("Unable to reach the server. Please try again.")
        } finally {
            busy.current = false;
            setLoading(false)
        }
    }

    return {
        showPassword,
        setShowPassword,
        email,
        setEmail,
        password,
        setPassword,
        remember,
        setRemember,
        signIn,
        loading,
        setLoading,
    };
};