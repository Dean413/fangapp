import { NextResponse } from "next/server";
import { getStoryBySlug } from "@/lib/stories";
import { getFanSummary } from "@/lib/fan";

export async function GET(
    _: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const story = await getStoryBySlug(slug);
        if (!story) return NextResponse.json({ supporters: 0, top: [] }, { status: 404 });

        const summary = await getFanSummary(String(story.id));
        return NextResponse.json(summary, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ supporters: 0, top: [] }, { status: 500 });
    }
}