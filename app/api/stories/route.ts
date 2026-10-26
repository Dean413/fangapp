import { listStories, StorySort } from "@/lib/stories";
import { NextResponse } from "next/server";
import { translateMsg } from "@/lib/i18n";

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
                message: await translateMsg("failedFetchStories"),
            },
            {
                status: 500,
            }
        );
    }
}

