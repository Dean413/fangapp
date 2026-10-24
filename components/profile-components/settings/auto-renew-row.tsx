"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "@/lib/store/toastStore";
import SettingRow from "@/components/profile-components/settings/settings-row";
import ToggleSwitch from "@/components/profile-components/settings/toggle-switch";

// Settings row: VIP auto-renewal on/off. Only shown to readers who have a renewing (or just switched off) VIP subscription.
// Switching off keeps VIP until the end of the period already paid for, and it can be switched back on until then.
export default function AutoRenewRow() {
    const t = useTranslations("Vip");
    const locale = useLocale();
    const [state, setState] = useState<"unknown" | "none" | "on" | "off">("unknown");
    const [endsAt, setEndsAt] = useState<string | null>(null);
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);
    // Blocks a second click before the page has re-drawn
    const lock = useRef(false);

    useEffect(() => {
        let alive = true;
        fetch("/api/vip/subscription", { credentials: "include", cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((body) => {
                if (!alive) return;
                setState(body?.recurring ? "on" : body?.resumable ? "off" : "none");
            })
            .catch(() => { if (alive) setState("none"); });
        fetch("/api/vip/status", { credentials: "include", cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((body) => { if (alive) setEndsAt((body?.vip ?? body)?.endsAt ?? null); })
            .catch(() => { });
        return () => { alive = false; };
    }, []);

    if (state === "unknown" || state === "none") return null;

    const endsOn = endsAt
        ? new Date(endsAt).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
        : "";

    const change = async (action: "cancel" | "resume") => {
        if (lock.current) return;
        lock.current = true;
        setBusy(true);
        try {
            const res = await fetch("/api/vip/subscription", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ action }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast.error(data.message || t("cancelFailed"));
                return;
            }
            setState(action === "cancel" ? "off" : "on");
            setConfirming(false);
            toast.success(action === "cancel" ? t("renewalCancelled") : t("renewalResumed"));
        } catch {
            toast.error(t("cancelFailed"));
        } finally {
            lock.current = false;
            setBusy(false);
        }
    };

    return (
        <SettingRow
            title={t("autoRenewal")}
            description={t("subscriptionModeText")}
            action={
                confirming ? (
                    <div className="flex items-center gap-2 text-sm">
                        <button type="button" onClick={() => change("cancel")} disabled={busy} className="rounded-lg bg-red-600 px-3 py-1 font-semibold text-white disabled:opacity-50">{t("cancelYes")}</button>
                        <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="rounded-lg border border-gray-300 dark:border-neutral-600 px-3 py-1 disabled:opacity-50">{t("cancelNo")}</button>
                    </div>
                ) : (
                    <ToggleSwitch
                        enabled={state === "on"}
                        onChange={() => {
                            if (busy) return;
                            if (state === "on") setConfirming(true);
                            else change("resume");
                        }}
                    />
                )
            }
        />
    );
}