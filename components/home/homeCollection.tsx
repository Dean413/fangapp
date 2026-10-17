// app/components/home/homeCollections.tsx
// Every Home collection from the admin, in the admin's order.
// A collection whose name contains "Trending" gets the Top Trending layout; the rest are cover rows.
import { getHomeCollections } from "@/lib/home";
import BookShelf from "./bookShelf";
import TrendingSection from "./trendingSection";

type Props = {
    tenant: string;
    language?: string;
    platform?: "Websites" | "Apps";
};

export default async function HomeCollections({ tenant, language, platform }: Props) {
    const collections = await getHomeCollections({ tenant, language, platform });

    if (collections.length === 0) return null;

    return (
        <div className="w-[90%] mx-auto mt-4 space-y-12">
            {collections.map((c) =>
                /trending/i.test(c.name) ? <TrendingSection key={c.id} collection={c} /> : <BookShelf key={c.id} collection={c} />
            )}
        </div>
    );
}