import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/auth/session";
import { recordView } from "@/lib/view";

const COOKIE = "fang_vid";
const YEAR = 60 * 60 * 24 * 365;
const BOT = /bot|crawler|spider|crawling|headless|preview|facebookexternalhit|slurp|curl|wget|python-requests/i;

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    if (BOT.test(request.headers.get("user-agent") ?? "")) return NextResponse.json({ counted: false });

    const { slug } = await params;

    try {
        const user = await getCurrentUser();
        const existing = request.cookies.get(COOKIE)?.value;
        const anonId = existing && /^[0-9a-f-]{36}$/.test(existing) ? existing : randomUUID();

        const result = await recordView({ slug, userId: user ? String(user.id) : null, anonId: user ? null : anonId });

        const res = NextResponse.json({ counted: result === "counted" });
        if (!user && anonId !== existing) {
            res.cookies.set(COOKIE, anonId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: YEAR });
        }
        return res;
    } catch (error) {
        console.error("View error:", error);
        return NextResponse.json({ counted: false });
    }
}