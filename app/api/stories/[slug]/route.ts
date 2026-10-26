import { getStoryBySlug } from "@/lib/stories";
import { NextResponse } from "next/server";
import { translateMsg } from "@/lib/i18n";

export async function GET(
    _: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;

        const story = await getStoryBySlug(slug);

        if (!story) {
            return NextResponse.json(
                { message: await translateMsg("storyNotFound") },
                { status: 404 }
            );
        }

        return NextResponse.json(story);
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { message: await translateMsg("failedFetchStory") },
            { status: 500 }
        );
    }
}


