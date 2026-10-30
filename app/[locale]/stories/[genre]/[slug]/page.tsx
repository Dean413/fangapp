// The book page is built on the server, so Google gets the real book (title, cover, author, synopsis)
// in the first HTML, a missing book is a real 404, and an old link is a permanent redirect to the new one.
import { notFound, permanentRedirect } from "next/navigation";
import { getStoryBySlug } from "@/lib/stories";
import BookView from "./bookView";

const RAW_SITE = (process.env.SITE_URL || "https://fangapp.io").trim().replace(/\/+$/, "");
const SITE = /^https?:\/\//i.test(RAW_SITE)
    ? RAW_SITE
    : `${/^(localhost|127\.)/i.test(RAW_SITE) ? "http" : "https"}://${RAW_SITE}`;

type Props = { params: Promise<{ locale: string; genre: string; slug: string }> };

export default async function Page({ params }: Props) {
    const { locale, genre, slug } = await params;
    const book = await getStoryBySlug(slug);
    if (!book) notFound();

    // Same book, but the link is old (renamed book, or the genre changed): send Google and readers to the current one
    const prefix = locale === "en" ? "" : `/${locale}`;
    if (book.slug !== slug || book.genreSlug !== genre) {
        permanentRedirect(`${prefix}/stories/${book.genreSlug}/${book.slug}`);
    }

    const cover = book.image.startsWith("http") ? book.image : `${SITE}${book.image}`;
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Book",
        name: book.title,
        url: `${SITE}${prefix}/stories/${book.genreSlug}/${book.slug}`,
        image: cover,
        description: (book.summary ?? "").slice(0, 500) || undefined,
        genre: book.genre || undefined,
        inLanguage: locale,
        author: book.author && book.author !== "Unknown" ? { "@type": "Person", name: book.author } : undefined,
    };

    return (
        <>
            <script
                type="application/ld+json"
                // "<" is escaped so a title can never close the script tag
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
            />
            <BookView book={book} />
        </>
    );
}