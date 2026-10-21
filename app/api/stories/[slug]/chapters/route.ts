import { NextResponse } from "next/server";
import { getStoryBySlug, listChapters } from "@/lib/stories";
import { getCurrentUser } from "@/lib/auth/session";
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

        // Signed-in reader: chapters they unlocked come back as unlocked
        const user = await getCurrentUser();
        const chapters = await listChapters(story, user?.id ?? null);

        return NextResponse.json(chapters, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { message: await translateMsg("failedFetchChapters") },
            { status: 500 }
        );
    }
}