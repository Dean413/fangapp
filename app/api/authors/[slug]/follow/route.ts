// app/api/authors/[slug]/follow/route.ts
// POST = follow the author, DELETE = unfollow. Signed-in readers only; doing either twice changes nothing.
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { setFollow } from "@/lib/authors";

type Context = { params: Promise<{ slug: string }> };

const STATUS = { NOT_FOUND: 404, SELF: 400, TOO_FAST: 429, TOO_MANY: 400 } as const;

async function handle(follow: boolean, context: Context) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Please sign in first" }, { status: 401 });

    try {
        const { slug } = await context.params;
        const result = await setFollow(user.id, slug, follow);
        if (!result.ok) {
            return NextResponse.json({ message: "Couldn't follow this author", code: result.code }, { status: STATUS[result.code] });
        }
        return NextResponse.json(
            { following: result.following, followers: result.followers },
            { headers: { "Cache-Control": "no-store" } }
        );
    } catch (error) {
        console.error("Follow error:", error);
        return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
    }
}

export async function POST(_request: NextRequest, context: Context) {
    return handle(true, context);
}

export async function DELETE(_request: NextRequest, context: Context) {
    return handle(false, context);
}