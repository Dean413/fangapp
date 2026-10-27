import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getVipStatus, syncVipDay } from "@/lib/vip";
import { getWalletBalance } from "@/lib/wallet";
import { logError } from "@/lib/log";

// Called when a signed-in reader opens the app: saves their timezone and credits today's VIP bonus coins
export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ message: "Sign in first." }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const timezone = typeof body?.timezone === "string" ? body.timezone.trim() : null;

        const { credited } = await syncVipDay(user.id, timezone);
        const [vip, wallet] = await Promise.all([getVipStatus(user.id), getWalletBalance(user.id)]);

        return NextResponse.json({ credited, vip, wallet }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        logError(error);
        return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
    }
}