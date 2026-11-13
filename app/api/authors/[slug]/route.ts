// app/api/authors/[slug]/route.ts
// GET   an author's page for the app (same data as the website's /authors/[slug]):
//       { author: { penName, slug, image }, followers, following, isSelf, books: [...] }
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorPage } from "@/lib/authors";
import { reply } from "@/lib/auth/rules";
import { logError } from "@/lib/log";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    try {
        const user = await getCurrentUser();
        const page = await getAuthorPage(slug, user?.id ?? null);
        if (!page) return reply(404, "notFound");
        const { userId: _id, ...author } = page.author; // the account id stays private
        return reply(200, "OK", { ...page, author });
    } catch (error) {
        logError("Author page error:", error);
        return reply(500, "somethingWrong");
    }
}