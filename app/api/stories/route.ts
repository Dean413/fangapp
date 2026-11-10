// app/api/stories/route.ts
import { listCuratedAllBooks, listCuratedGenreBooks, listStories, StorySort, toCurationPlatform } from "@/lib/stories";
import { NextResponse } from "next/server";
import { translateMsg } from "@/lib/i18n";

// GET /api/stories?genre=<slug>&status=ongoing|completed&short=true&sort=new|views|likes|recommended&exclude=<slug>
//                 &language=<e.g. English>&limit=<n>&curated=true&platform=Websites|Apps
// curated=true: the admin's Genre curation. With genre = that genre's books in the admin's order;
// without genre = every curated book across all genres, each once.
// platform=Apps reads the mobile app's curation; if it has nothing there, the website's is used.
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");
        const sort = searchParams.get("sort");
        const language = (searchParams.get("language") ?? "").trim().slice(0, 40) || null;
        const limit = Number(searchParams.get("limit")) || undefined;

        if (searchParams.get("curated") === "true") {
            const genre = (searchParams.get("genre") ?? "").trim().slice(0, 80);
            const lang = language || "English";
            const platform = toCurationPlatform(searchParams.get("platform"));
            const load = (p: typeof platform) =>
                genre ? listCuratedGenreBooks(genre, lang, limit, p) : listCuratedAllBooks(lang, limit, p);

            let books = await load(platform);
            if (books.length === 0 && platform === "Apps") books = await load("Websites");
            return NextResponse.json(books);
        }

        const stories = await listStories({
            genre: searchParams.get("genre"),
            status: status === "ongoing" || status === "completed" ? status : null,
            short: searchParams.get("short") === "true",
            sort: (["new", "views", "likes", "recommended"] as StorySort[]).includes(sort as StorySort)
                ? (sort as StorySort)
                : "new",
            exclude: searchParams.get("exclude"),
            language,
            limit,
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