// app/collections/[id]/page.tsx
// "View All" for a Home collection: every book in it, in the admin's order.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import Footer from "@/components/footer";
import { getHomeCollection } from "@/lib/home";
import { getTranslations } from "next-intl/server";
import { Cover, Rating, bookHref, formatCount } from "@/components/home/bookBits";
import { BookPills } from "@/components/home/bookPill";

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

                <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {collection.books.map((book) => (
                        <Link key={book.id} href={bookHref(book)} className="group block min-w-0">
                            <Cover book={book} imprint="sm" className="aspect-3/4 w-full" />
                            <h2 className="mt-2 line-clamp-1 text-sm font-semibold text-gray-900 dark:text-white">{book.title}</h2>
                            <p className="mt-0.5 line-clamp-1 text-xs text-gray-500 dark:text-neutral-400">{book.author}</p>
                            <div className="mt-1.5">
                                <BookPills book={book} />
                            </div>
                            <p className="mt-1.5 flex items-center gap-3 text-[11px] text-gray-500 dark:text-neutral-400">
                                <span className="inline-flex items-center gap-1"><Eye size={12} /> {formatCount(book.views)} views</span>
                                <Rating book={book} />
                            </p>
                        </Link>
                    ))}
                </div>
            </div>
            <Footer />
        </div>
    );
}