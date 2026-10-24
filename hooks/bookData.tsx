import { BookCard } from "@/components/cards/home-cards/cards";
import { BookGridSkeleton } from "@/components/skeleton";
import Link from "next/link";
import { useTranslations } from "next-intl";

export const SectionHeader = ({ title, href }: { title: string; href: string }) => {
    const t = useTranslations("Books");
    return (
        <div className="flex items-center justify-between z-35 mb-5">
            <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
                <div className="w-12 border-b-4 border-red-500 mt-1"></div>
            </div>

            <Link href={href} className="text-red-500 dark:text-red-400 text-sm font-medium hover:underline shrink-0">
                {t("viewAll")}
            </Link>
        </div>
    );
};

export const BookGrid = ({ data, loading = false }: { data: any; loading?: boolean }) =>
    loading ? (
        <BookGridSkeleton />
    ) : (
        <div className="flex no-scrollbar gap-3 sm:gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2">
            {data.map((item: any) => (
                <Link href={`/stories/${item.genreSlug || "all"}/${item.slug}`} key={item.id} className="flex-none snap-start w-[calc(100%/3-18px)]  md:w-[calc(100%/5-12px)] lg:w-[calc(100%/7-14px)]">
                    <BookCard {...item} />
                </Link>
            ))}
        </div>
    );