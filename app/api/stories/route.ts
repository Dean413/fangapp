/* eslint-disable @typescript-eslint/no-explicit-any */
import { createStory, listStories, StorySort } from "@/lib/stories";
import { verifyAuth } from "@/lib/rbac";
import { NextResponse } from "next/server";

// GET /api/stories?genre=<slug>&status=ongoing|completed&short=true&sort=new|views|likes|recommended&exclude=<slug>
//                 &language=<e.g. English>&limit=<n>
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");
        const sort = searchParams.get("sort");
        const language = (searchParams.get("language") ?? "").trim().slice(0, 40) || null;

        const stories = await listStories({
            genre: searchParams.get("genre"),
            status: status === "ongoing" || status === "completed" ? status : null,
            short: searchParams.get("short") === "true",
            sort: (["new", "views", "likes", "recommended"] as StorySort[]).includes(sort as StorySort)
                ? (sort as StorySort)
                : "new",
            exclude: searchParams.get("exclude"),
            language,
            limit: Number(searchParams.get("limit")) || undefined,
        });

        return NextResponse.json(stories);
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            {
                message: "Failed to fetch stories.",
            },
            {
                status: 500,
            }
        );
    }
}

// POST /api/stories - create a story (writers & admins)
export async function POST(req: Request) {
    try {
        const user = await verifyAuth(req, ['writer', 'author', 'admin']);
        if (user instanceof Response) return user;

        const body = await req.json();

        if (!body.title || !body.genre) {
            return NextResponse.json(
                {
                    message: "Title and genre are required.",
                },
                {
                    status: 400,
                }
            );
        }

        const story = await createStory(user.id, body);

        return NextResponse.json(story, {
            status: 201,
        });
    } catch (error: any) {
        console.error(error);

        return NextResponse.json(
            {
                message: "Failed to create story.",
            },
            {
                status: 500,
            }
        );
    }
}