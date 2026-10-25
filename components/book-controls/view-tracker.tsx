"use client";

import { useEffect } from "react";

const STAY_MS = 4000;

export default function ViewTracker({ slug }: { slug: string }) {
    useEffect(() => {
        if (!slug) return;
        const timer = setTimeout(() => {
            fetch(`/api/stories/${encodeURIComponent(slug)}/view`, {
                method: "POST",
                credentials: "include",
            }).catch(() => { });
        }, STAY_MS);
        return () => clearTimeout(timer);
    }, [slug]);

    return null;
}