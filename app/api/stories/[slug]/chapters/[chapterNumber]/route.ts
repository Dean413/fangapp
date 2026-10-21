import { getChapter, getStoryBySlug } from "@/lib/stories";
import { getCurrentUser } from "@/lib/auth/session";
import { NextResponse } from "next/server";
import { translateMsg } from "@/lib/i18n";

export async function GET(
    _: Request,
    { params }: { params: Promise<{ slug: string; chapterNumber: string }> }
) {
    try {
        const { slug, chapterNumber } = await params;

        const chapterNum = Number(chapterNumber);

        if (!Number.isInteger(chapterNum) || chapterNum < 1) {
            return NextResponse.json(
                { message: await translateMsg("invalidChapterNumber") },
                { status: 400 }
            );
        }

        const story = await getStoryBySlug(slug);

        if (!story) {
            return NextResponse.json(
                { message: await translateMsg("storyNotFound") },
                { status: 404 }
            );
        }

        // The signed-in reader: chapters they unlocked (or wrote) come back in full
        const user = await getCurrentUser();
        const chapter = await getChapter(story, chapterNum, user?.id ?? null);

        if (!chapter) {
            return NextResponse.json(
                { message: await translateMsg("chapterNotFoundDot") },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { story, chapter },
            { status: 200, headers: { "Cache-Control": "no-store" } }
        );
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { message: await translateMsg("failedFetchChapter") },
            { status: 500 }
        );
    }
}