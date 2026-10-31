// Each genre is its own server-built page (/genre/werewolf), so Google gets the real book list and book links.
import { notFound, permanentRedirect } from "next/navigation";
import { languageForLocale } from "@/lib/language";
import { listCuratedAllBooks, listCuratedGenreBooks, listCuratedGenres } from "@/lib/stories";
import GenreBrowser from "../genreBrowser";

type Props = {
    params: Promise<{ locale: string; genre?: string[] }>;
    searchParams: Promise<{ genre?: string | string[] }>;
};

export default async function Page({ params, searchParams }: Props) {
    const { locale, genre } = await params;
    const query = await searchParams;
    const prefix = locale === "en" ? "" : `/${locale}`;

    // Old links like /genre?genre=werewolf move permanently to /genre/werewolf
    const old = (Array.isArray(query.genre) ? query.genre[0] : query.genre)?.trim();
    if (old && !genre) permanentRedirect(`${prefix}/genre/${encodeURIComponent(old.slice(0, 80))}`);

    if (genre && genre.length > 1) notFound();
    const selected = (genre?.[0] ?? "").slice(0, 80);
    const language = languageForLocale(locale);

    const genres = await listCuratedGenres(language).catch(() => []);
    // A genre that isn't in the admin's list is a real 404 (only checked when the list loaded)
    if (selected && genres.length > 0 && !genres.some((g) => g.slug === selected)) notFound();

    const books = await (selected
        ? listCuratedGenreBooks(selected, language, 100)
        : listCuratedAllBooks(language, 500)
    ).catch(() => null);

    return <GenreBrowser genres={genres} books={books} selected={selected} />;
}