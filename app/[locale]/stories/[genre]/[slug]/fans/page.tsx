// Top Fans: the readers who gifted this book the most (all-time). Built on the server, like the book page.
import { notFound, permanentRedirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getFanBoard } from "@/lib/fan";
import { getStoryBySlug } from "@/lib/stories";
import FansView from "@/components/fans/fanView";

type Props = {
    params: Promise<{ locale: string; genre: string; slug: string }>;
};

export default async function Page({ params }: Props) {
    const { locale, genre, slug } = await params;

    const book = await getStoryBySlug(slug);
    if (!book) notFound();

    // An old link (renamed book, or the genre changed) goes to the current one
    const prefix = locale === "en" ? "" : `/${locale}`;
    if (book.slug !== slug || book.genreSlug !== genre) {
        permanentRedirect(`${prefix}/stories/${book.genreSlug}/${book.slug}/fans`);
    }

    const user = await getCurrentUser();
    const board = await getFanBoard(String(book.id), "gifts", "overall", user?.id ?? null).catch(() => null);

    return (
        <FansView
            kind="gifts"
            book={{ slug: book.slug, title: book.title, genreSlug: book.genreSlug, image: book.image }}
            tab="overall"
            board={board}
        />
    );
}