import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import type { Vip } from "./types";

// The signed-in reader's active VIP plan (same status call as the navbar)
export function useMyVip(): Vip {
    const userId = useAuthStore((s) => s.user?.id ?? null);
    const [plan, setPlan] = useState<Vip>(null);
    useEffect(() => {
        if (!userId) { setPlan(null); return; }
        let alive = true;
        fetch("/api/vip/status", { credentials: "include", cache: "no-store" })
            .then((r) => r.json())
            .then((body) => {
                if (!alive) return;
                const s = body?.vip ?? body;
                setPlan(s?.active && (s.plan === "weekly" || s.plan === "monthly") ? s.plan : null);
            })
            .catch(() => { if (alive) setPlan(null); });
        return () => { alive = false; };
    }, [userId]);
    return plan;
}