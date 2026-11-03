// lib/activity.ts
// Records what a reader did (sign-ins for now) with their IP address and browser, for the admin's User Activity page.
// Never throws: activity tracking must not break sign-in. Rows older than 90 days are cleared.
import "server-only";
import { headers } from "next/headers";
import { dbPool } from "@/lib/db";
import { logError } from "@/lib/log";

const KEEP_DAYS = 90;

// "Mozilla/5.0 (Windows NT 10.0 ...) Chrome/126 ..." -> "Chrome/Windows"
export function deviceName(ua: string | null): string | null {
    if (!ua) return null;
    const browser = /Edg\//.test(ua) ? "Edge"
        : /OPR\/|Opera/.test(ua) ? "Opera"
            : /Firefox\//.test(ua) ? "Firefox"
                : /Chrome\/|CriOS\//.test(ua) ? "Chrome"
                    : /Safari\//.test(ua) ? "Safari"
                        : "Browser";
    const os = /iPhone/.test(ua) ? "iPhone"
        : /iPad/.test(ua) ? "iPad"
            : /Android/.test(ua) ? "Android"
                : /Windows/.test(ua) ? "Windows"
                    : /Mac OS X|Macintosh/.test(ua) ? "Mac"
                        : /Linux/.test(ua) ? "Linux"
                            : "Unknown";
    return `${browser}/${os}`;
}

export async function logActivity(userId: string, kind: string, details: string | null) {
    try {
        const h = await headers();
        const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
        const ip = (forwarded || h.get("x-real-ip") || "").slice(0, 64) || null;
        const device = deviceName(h.get("user-agent"));

        await dbPool.query(
            `INSERT INTO user_activity (user_id, kind, details, ip, device) VALUES ($1, $2, $3, $4, $5)`,
            [userId, kind, details, ip, device]
        );

        if (Math.random() < 0.02) {
            await dbPool.query(`DELETE FROM user_activity WHERE created_at < now() - make_interval(days => $1)`, [KEEP_DAYS]);
        }
    } catch (error) {
        logError("Activity log failed:", error);
    }
}