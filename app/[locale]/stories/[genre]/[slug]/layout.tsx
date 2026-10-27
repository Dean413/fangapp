// The book page is a client component, so the link preview (WhatsApp, Telegram, X, Facebook) comes from here.
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getStoryBySlug } from "@/lib/stories";

const RAW_SITE = (process.env.SITE_URL || "https://fangapp.io").trim().replace(/\/+$/, "");
// A value without http(s):// (e.g. "fangapp.io" or "localhost:3000") would make new URL() throw
const SITE = /^https?:\/\//i.test(RAW_SITE)
    ? RAW_SITE
    : `${/^(localhost|127\.)/i.test(RAW_SITE) ? "http" : "https"}://${RAW_SITE}`;

type Props = { children: React.ReactNode; params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const story = await getStoryBySlug(slug).catch(() => null);
    if (!story) return {};

    const t = await getTranslations("Meta");
    const values = { title: story.title, author: story.author, genre: story.genre };
    // Books owned by the platform show no author
    const title = story.author ? t("bookTitle", values) : t("bookTitleNoAuthor", values);
    const description = story.author ? t("bookDescription", values) : t("bookDescriptionNoAuthor", values);
    // WhatsApp ignores big images (covers can be several MB), so send a resized copy
    const image = story.image.startsWith("http")
        ? `${SITE}/_next/image?url=${encodeURIComponent(story.image)}&w=640&q=75`
        : `${SITE}${story.image}`;

    return {
        metadataBase: new URL(SITE),
        title,
        description,
        openGraph: { title, description, type: "website", siteName: "FANG", images: [{ url: image, alt: story.title }] },
        twitter: { card: "summary_large_image", title, description, images: [image] },
    };
}

export default function BookLayout({ children }: Props) {
    return children;
}