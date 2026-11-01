import { NextResponse } from "next/server";
import { getStoryBySlug } from "@/lib/stories";
import { getCurrentUser } from "@/lib/auth/session";
import { getGiftPanel } from "@/lib/fan";

export async function GET(
    _: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const story = await getStoryBySlug(slug);
        if (!story) return NextResponse.json({ gifts: 0, fans: [], me: { rank: null, points: 0 } }, { status: 404 });

        const user = await getCurrentUser();
        const panel = await getGiftPanel(String(story.id), user?.id ?? null);
        return NextResponse.json(panel, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ gifts: 0, fans: [], me: { rank: null, points: 0 } }, { status: 500 });
    }
}