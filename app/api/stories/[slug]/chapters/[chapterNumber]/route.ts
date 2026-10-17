import { getChapter, getStoryBySlug } from "@/lib/stories";
import { NextResponse } from "next/server";

export async function GET(
    _: Request,
    { params }: { params: Promise<{ slug: string; chapterNumber: string }> }
) {
    try {
        const { slug, chapterNumber } = await params;

        const chapterNum = Number(chapterNumber);

        if (!Number.isInteger(chapterNum) || chapterNum < 1) {
            return NextResponse.json(
                { message: "Invalid chapter number." },
                { status: 400 }
            );
        }

        const story = await getStoryBySlug(slug);

        if (!story) {
            return NextResponse.json(
                { message: "Story not found" },
                { status: 404 }
            );
        }

        const chapter = await getChapter(story, chapterNum);

        if (!chapter) {
            return NextResponse.json(
                { message: "Chapter not found." },
                { status: 404 }
            );
        }

        return NextResponse.json({ story, chapter }, { status: 200 });
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { message: "Failed to fetch chapter." },
            { status: 500 }
        );
    }
}
