import { NextResponse } from "next/server";
import { getStoryBySlug, listChapters } from "@/lib/stories";

export async function GET(
    _: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;

        const story = await getStoryBySlug(slug);

        if (!story) {
            return NextResponse.json(
                { message: "Story not found" },
                { status: 404 }
            );
        }

        // Chapter list only (no content), with paywall status per chapter
        const chapters = await listChapters(story);

        return NextResponse.json(chapters);
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { message: "Failed to fetch story chapters" },
            { status: 500 }
        );
    }
}
