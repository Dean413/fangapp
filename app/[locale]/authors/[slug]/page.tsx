// app/[locale]/authors/[slug]/page.tsx
// An author's page: their card (photo, pen name, followers, Follow) and every published book.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { findAuthor, getAuthorPage } from "@/lib/authors";
import AuthorHeader from "@/components/authors/header";
import AuthorBookRow from "@/components/authors/book";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const author = await findAuthor(slug);
    return { title: author?.penName };
}

export default async function AuthorPage({ params }: Props) {
    const { slug } = await params;
    const user = await getCurrentUser();
    const page = await getAuthorPage(slug, user?.id ?? null);
    if (!page) notFound();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark">
            <div className="mx-auto w-[92%] max-w-3xl space-y-4 py-6 md:py-10">
                <AuthorHeader
                    slug={page.author.slug}
                    penName={page.author.penName}
                    image={page.author.image}
                    followers={page.followers}
                    following={page.following}
                    isSelf={page.isSelf}
                />

                <div className="space-y-3">
                    {page.books.map((book) => <AuthorBookRow key={book.id} book={book} />)}
                </div>
            </div>
        </div>
    );
}