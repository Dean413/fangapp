/* eslint-disable @typescript-eslint/no-explicit-any */
import { getStoryBySlug, storyBelongsToUser, updateStoryBySlug } from "@/lib/stories";
import { verifyAuth } from "@/lib/rbac";
import { NextRequest, NextResponse } from "next/server";
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

// PUT /api/stories/[slug] - update your own story (admins can update any)
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const body = await req.json();
        const user = await verifyAuth(req, ['writer', 'author', 'admin']);
        if (user instanceof Response) return user;

        if (user.role !== 'admin' && !(await storyBelongsToUser(slug, user.id))) {
            return NextResponse.json(
                { message: "Story not found or not authorized to update" },
                { status: 404 }
            );
        }

        const updated = await updateStoryBySlug(slug, body);

        if (!updated) {
            return NextResponse.json(
                { message: "No fields to update" },
                { status: 400 }
            );
        }

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error(error);

        return NextResponse.json(
            { message: "Failed to update story" },
            { status: 500 }
        );
    }
}
