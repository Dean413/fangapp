import { permanentRedirect } from "next/navigation";

// The genres page moved to /genre: old /stories and /stories?genre=x links go there
export default async function Page({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ genre?: string | string[] }>;
}) {
    const { locale } = await params;
    const query = await searchParams;
    const genre = (Array.isArray(query.genre) ? query.genre[0] : query.genre)?.trim();
    const prefix = locale === "en" ? "" : `/${locale}`;
    permanentRedirect(genre ? `${prefix}/genre/${encodeURIComponent(genre)}` : `${prefix}/genre`);
}