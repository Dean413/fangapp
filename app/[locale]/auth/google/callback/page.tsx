/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/lib/store/toastStore";
import { useAuthStore } from "@/lib/store/authStore";
import { useTranslations } from "next-intl";

function GoogleCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const hasCalled = useRef(false);
    const t = useTranslations("Auth");

    useEffect(() => {
        const code = searchParams.get("code");
        if (!code || hasCalled.current) return;

        hasCalled.current = true;

        const authenticate = async () => {
            try {
                const res = await fetch("/api/auth/google", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ code }),
                });

                const data = await res.json();

                if (!res.ok) throw new Error(data.message);

                toast.success(data.message || t("loggedIn"));

                await useAuthStore.getState().fetchUser();

                router.push("/");
                router.refresh();
            } catch (err: any) {
                toast.error(err.message || t("failedLogin", { provider: "Google" }));
                router.push("/");
            }
        };

        authenticate();
    }, [searchParams]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white dark:bg-dark p-4 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-955 dark:text-white mb-2">{t("authenticating", { provider: "Google" })}</h2>
            <p className="text-gray-500 dark:text-neutral-400">{t("pleaseWait")}</p>
        </div>
    );
}

export default function GoogleCallback() {
    const c = useTranslations("Common");
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white dark:bg-dark p-4 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
                <h2 className="text-xl font-semibold text-gray-955 dark:text-white mb-2">{c("loading")}</h2>
            </div>
        }>
            <GoogleCallbackContent />
        </Suspense>
    );
}
