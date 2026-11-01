// Fan Contributions: the readers who voted for this book the most. Monthly resets on the 1st (UTC).
import { notFound, permanentRedirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getFanBoard } from "@/lib/fan";
import { getStoryBySlug } from "@/lib/stories";
import FansView from "@/components/fans/fanView";

type Props = {
    params: Promise<{ locale: string; genre: string; slug: string }>;
    searchParams: Promise<{ tab?: string | string[] }>;
};

export default async function Page({ params, searchParams }: Props) {
    const { locale, genre, slug } = await params;
    const query = await searchParams;

    const book = await getStoryBySlug(slug);
    if (!book) notFound();

    const prefix = locale === "en" ? "" : `/${locale}`;
    if (book.slug !== slug || book.genreSlug !== genre) {
        permanentRedirect(`${prefix}/stories/${book.genreSlug}/${book.slug}/votes`);
    }

    // Opens on Monthly; Overall only when asked for
    const tab = (Array.isArray(query.tab) ? query.tab[0] : query.tab) === "overall" ? "overall" : "monthly";
    const user = await getCurrentUser();
    const board = await getFanBoard(String(book.id), "votes", tab, user?.id ?? null).catch(() => null);

    return (
        <FansView
            kind="votes"
            book={{ slug: book.slug, title: book.title, genreSlug: book.genreSlug, image: book.image }}
            tab={tab}
            board={board}
        />
    );
}