// app/collections/[id]/page.tsx
// "View All" for a Home collection: every book in it, in the admin's order, one row per book.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import Footer from "@/components/footer";
import { getHomeCollection } from "@/lib/home";
import { getTranslations } from "next-intl/server";
import { Cover, CoverRibbons, Rating, bookHref, formatCount } from "@/components/home/bookBits";
import { BookPills } from "@/components/home/bookPill";
import BookmarkButton from "@/components/home/bookmarkButton";

// Always the admin's latest list
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const collection = await getHomeCollection(id);
    const t = await getTranslations("Collection");
    return { title: collection ? `${collection.name} | Fang` : t("metaTitle") };
}

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const collection = await getHomeCollection(id);
    if (!collection) notFound();
    const t = await getTranslations("Collection");
    const b = await getTranslations("Books");

    return (
        <div className="min-h-screen bg-white dark:bg-dark">
            <div className="w-[90%] mx-auto pt-6 md:pt-8 pb-12 md:pb-16">
                <nav aria-label={t("breadcrumb")} className="flex items-center gap-2 text-sm text-gray-500 dark:text-neutral-400">
                    <Link href="/" className="hover:text-gray-900 dark:hover:text-white">{t("home")}</Link>
                    <span aria-hidden="true">/</span>
                    <span className="font-semibold text-gray-900 dark:text-white truncate">{collection.name}</span>
                </nav>

                <div className="mt-5 md:mt-6">
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{collection.name}</h1>
                    <span className="mt-1 block h-0.5 w-8 rounded bg-red-600 dark:bg-red-500" />
                    {collection.description && (
                        <p className="mt-3 max-w-3xl text-sm text-gray-600 dark:text-neutral-400">{collection.description}</p>
                    )}
                    <p className="mt-2 text-xs text-gray-500 dark:text-neutral-500">
                        {t("bookCount", { count: collection.books.length })}
                    </p>
                </div>

                <div className="mt-6 flex flex-col gap-4">
                    {collection.books.map((book) => {
                        const href = bookHref(book);
                        const readHref = book.kind === "comic" ? href : `${href}/reader?chapter=1`;
                        return (
                            <div key={book.id}
                                className="flex items-start gap-3 md:gap-4 rounded-xl border border-gray-100 bg-white p-3 md:p-4 shadow-sm dark:border-dark-border dark:bg-dark-raised dark:shadow-none">
                                <Link href={href} className="group shrink-0">
                                    <div className="relative w-18 md:w-21 overflow-hidden rounded-md">
                                        <Cover book={book} imprint="sm" ribbons={false} className="aspect-2/3 w-full" />
                                        <CoverRibbons book={book} small />
                                    </div>
                                </Link>

                                <div className="min-w-0 flex-1">
                                    <BookPills book={book} />
                                    <Link href={href}>
                                        <h2 className="mt-1.5 line-clamp-1 text-sm md:text-base font-bold text-gray-900 dark:text-white">{book.title}</h2>
                                    </Link>
                                    <p className="mt-0.5 line-clamp-1 text-[11px] md:text-xs text-gray-500 dark:text-neutral-400">
                                        {b("byAuthor", { author: book.author })}
                                        {book.chapters ? ` · ${t("chaptersCount", { count: book.chapters })}` : ""}
                                    </p>
                                    <p className="mt-1.5 flex items-center gap-3 text-[11px] text-gray-500 dark:text-neutral-400">
                                        <span className="inline-flex items-center gap-1"><Eye size={12} /> {b("viewsCount", { views: formatCount(book.views) })}</span>
                                        <Rating book={book} />
                                    </p>
                                    {book.blurb && (
                                        <p className="mt-1.5 line-clamp-2 text-[11px] md:text-xs text-gray-600 dark:text-neutral-300">{book.blurb}</p>
                                    )}
                                </div>

                                <div className="flex shrink-0 items-center gap-2 md:gap-3">
                                    <Link href={readHref}
                                        className="rounded-full bg-[#D90404] px-3 md:px-4 py-1.5 text-[11px] md:text-xs font-semibold text-white hover:bg-red-700 transition whitespace-nowrap">
                                        {t("readNow")}
                                    </Link>
                                    {book.kind === "story" && (
                                        <BookmarkButton slug={book.slug} storyId={book.id} title={book.title} image={book.image} label={t("addToLibrary")} />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <Footer />
        </div>
    );
}