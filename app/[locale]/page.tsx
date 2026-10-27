import { Suspense } from "react";
import Footer from "@/components/footer";
import HomeCollections from "@/components/home/homeCollection";
import HomeSkeleton from "@/components/home/homeSkeleton";
import { languageForLocale } from "@/lib/language";
import Banner from "@/components/cards/home-cards/banner";
import BannerCarousel from "@/components/home/bannerCarousel";

const Home = async ({ params }: { params: Promise<{ locale: string }> }) => {
    const { locale } = await params;

    return (
        <div>
            <BannerCarousel />
            {/* The page shows straight away; the sections stream in when their books are loaded */}
            <Suspense fallback={<HomeSkeleton />}>
                <HomeCollections tenant="fang" language={languageForLocale(locale)} />
            </Suspense>
            <Footer />
        </div>
    )
};

export default Home;