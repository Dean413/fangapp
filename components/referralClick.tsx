// components/referralClick.tsx
// Counts a visit to an invite link (/?ref=CODE) once per page load. Shows nothing.
"use client";

import { useEffect } from "react";

export default function ReferralClick() {
    useEffect(() => {
        const code = new URLSearchParams(window.location.search).get("ref");
        if (!code || !/^[A-Za-z0-9]{4,20}$/.test(code)) return;
        fetch("/api/referral/click", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
        }).catch(() => { });
    }, []);
    return null;
}