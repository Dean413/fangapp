import { permanentRedirect } from "next/navigation";

// Old genre links (/stories/urban) open the new genre page (/genre/urban)
export default async function Page({ params }: { params: Promise<{ locale: string; genre: string }> }) {
    const { locale, genre } = await params;
    const prefix = locale === "en" ? "" : `/${locale}`;
    permanentRedirect(`${prefix}/genre/${encodeURIComponent(genre)}`);
}