// app/components/home/homeCollections.tsx
// Every Home collection from the admin, in the admin's order.
// A collection whose name contains "Trending" gets the Top Trending layout, one containing "Original" the
// Fang Originals layout (big rotating card + grid); the rest are cover rows.
import { getHomeCollections } from "@/lib/home";
import BookShelf from "./bookShelf";
import FeaturedSection from "./featuredSection";
import TrendingSection from "./trendingSection";
import ContinueReading from "../reader/continue-reading";
import { SectionHeader } from "./bookBits";
import RecommendedShelf from "./recommendedShelf";
import YouMayLikeSection from "./youMayLike";

type Props = {
    tenant: string;
    language?: string;
    platform?: "Websites" | "Apps";
};

export default async function HomeCollections({ tenant, language, platform }: Props) {
    const collections = await getHomeCollections({ tenant, language, platform });
    if (collections.length === 0) return null;
    const continueAt = Math.max(0, collections.length - 2);
    const continueCard = <ContinueReading key="continue-reading" viewAllHref="/library" />

    return (
        <div className="w-[90%] mx-auto mt-4 space-y-12">
            {collections.map((c, i) => [
                i === continueAt ? continueCard : null,
                /trending/i.test(c.name) ? <TrendingSection key={c.id} collection={c} />
                    : /you may like/i.test(c.name) ? <YouMayLikeSection key={c.id} collection={c} />
                        : /original/i.test(c.name) ? <FeaturedSection key={c.id} collection={c} />
                            : <BookShelf key={c.id} collection={c} />,
            ])}

            {/* <RecommendedShelf key="recommended" tenant={tenant} language={language} /> */}
        </div>
    );
}