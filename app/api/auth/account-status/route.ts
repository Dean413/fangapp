// app/api/auth/account-status/route.ts
// Lets the app check whether the signed-in reader is suspended (used by AccountBanner)
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAccountState } from "@/lib/auth/accountState";
import { logError } from "@/lib/log";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ status: null }, { status: 401 });

    try {
        return NextResponse.json(await getAccountState(user.id), { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        logError("Account status check failed:", error);
        return NextResponse.json({ status: null }, { status: 500 });
    }
}