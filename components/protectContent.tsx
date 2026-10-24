"use client";

import { useEffect } from "react";

export default function ProtectContent() {
    useEffect(() => {
        const allowed = (target: EventTarget | null) =>
            target instanceof HTMLElement && !!target.closest("input, textarea, [contenteditable='true'], .allow-select");

        const block = (e: Event) => {
            if (!allowed(e.target)) e.preventDefault();
        };
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && ["c", "x", "a", "s"].includes(e.key.toLowerCase()) && !allowed(e.target)) {
                e.preventDefault();
            }
        };

        const events = ["contextmenu", "copy", "cut", "dragstart", "selectstart"];
        events.forEach((name) => document.addEventListener(name, block));
        document.addEventListener("keydown", onKey);
        return () => {
            events.forEach((name) => document.removeEventListener(name, block));
            document.removeEventListener("keydown", onKey);
        };
    }, []);

    return null;
}