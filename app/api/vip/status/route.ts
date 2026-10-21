import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getVipStatus } from "@/lib/vip";
import { translateMsg } from "@/lib/i18n";

export async function GET() {
    try {
        const user = await getCurrentUser();
        const vip = await getVipStatus(user?.id ?? null);
        return NextResponse.json(vip, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: await translateMsg("failedLoadVip") }, { status: 500 });
    }
}