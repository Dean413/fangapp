import { Bone, BookGridSkeleton, CoverBone } from "@/components/skeleton";

// Section title + "View all"
function HeaderSkeleton() {
    return (
        <div className="mb-5 flex items-center justify-between">
            <div className="space-y-2">
                <Bone className="h-6 w-40" />
                <Bone className="h-1 w-12" />
            </div>
            <Bone className="h-4 w-14" />
        </div>
    );
}

// Top Trending: the big #1 card
function TopCardSkeleton() {
    return (
        <div className="flex h-full flex-col rounded-xl bg-white p-5 shadow-sm dark:bg-dark-card dark:shadow-none">
            <CoverBone className="mx-auto aspect-3/4 w-full max-w-50 rounded-lg" />
            <Bone className="mt-5 h-3 w-20" />
            <Bone className="mt-2 h-5 w-3/4" />
            <Bone className="mt-2 h-3 w-1/3" />
            <div className="mt-3 space-y-2">
                <Bone className="h-3 w-full" />
                <Bone className="h-3 w-5/6" />
            </div>
            <div className="mt-3 flex gap-1.5">
                <Bone className="h-4 w-14 rounded-full" />
                <Bone className="h-4 w-12 rounded-full" />
            </div>
        </div>
    );
}

// Top Trending: one numbered row (#2 to #4)
function TrendingRowSkeleton({ className = "flex" }: { className?: string }) {
    return (
        <div className={`${className} flex-1 items-center gap-3 sm:gap-4 rounded-xl bg-white p-3 sm:p-4 shadow-sm dark:bg-dark-card dark:shadow-none`}>
            <Bone className="h-8 w-6 sm:w-10 shrink-0" />
            <CoverBone className="aspect-3/4 w-16 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
                <Bone className="h-4 w-3/4" />
                <Bone className="h-3 w-1/2" />
                <Bone className="hidden h-3 w-full sm:block" />
                <div className="flex gap-1.5">
                    <Bone className="h-4 w-12 rounded-full" />
                    <Bone className="h-4 w-10 rounded-full" />
                </div>
            </div>
            <div className="shrink-0 space-y-1.5">
                <Bone className="h-4 w-10" />
                <Bone className="h-3 w-10" />
            </div>
        </div>
    );
}

function TrendingSkeleton() {
    return (
        <section>
            <HeaderSkeleton />
            <div className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <TopCardSkeleton />
                <div className="flex h-full flex-col gap-4">
                    <TrendingRowSkeleton />
                    <TrendingRowSkeleton />
                    {/* phones show #1, #2 and #3 only */}
                    <TrendingRowSkeleton className="hidden sm:flex" />
                </div>
            </div>
        </section>
    );
}

// Fang Originals: the big card and the grid (phones: a sideways row of 6)
function FeaturedSkeleton() {
    return (
        <section>
            <HeaderSkeleton />
            <div className="flex flex-col gap-6 lg:flex-row">
                <div className="lg:w-[32%] lg:shrink-0">
                    <div className="flex h-full flex-col rounded-xl bg-gray-50 p-5 md:p-6 dark:bg-dark-card">
                        <div className="flex flex-1 items-center justify-center py-2 md:py-6">
                            <CoverBone className="aspect-3/4 w-40 sm:w-48 lg:w-[62%] rounded-lg" />
                        </div>
                        <Bone className="mt-4 h-5 w-3/4" />
                        <Bone className="mt-2 h-3 w-1/2" />
                        <div className="mt-3 space-y-2">
                            <Bone className="h-3 w-full" />
                            <Bone className="h-3 w-full" />
                            <Bone className="h-3 w-2/3" />
                        </div>
                        <div className="mt-4 flex gap-1.5">
                            <Bone className="h-4 w-14 rounded-full" />
                            <Bone className="h-4 w-12 rounded-full" />
                        </div>
                    </div>
                </div>
                <div className="flex min-w-0 flex-1 gap-4 overflow-hidden sm:grid sm:grid-cols-3 sm:gap-y-6 lg:grid-cols-4">
                    {Array.from({ length: 8 }, (_, i) => (
                        <div key={i} className={`w-32 shrink-0 sm:w-auto sm:shrink ${i >= 6 ? "hidden sm:block" : ""}`}>
                            <CoverBone className="aspect-3/4 w-full rounded-xl" />
                            <div className="mt-2 space-y-2">
                                <Bone className="h-3 w-4/5" />
                                <Bone className="h-3 w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// Shown while the Home collections load. Same container as HomeCollections, so nothing jumps
// when the real sections arrive: a cover row, Top Trending, Fang Originals, then another cover row.
export default function HomeSkeleton() {
    return (
        <div className="w-[90%] mx-auto mt-4 space-y-12">
            <section>
                <HeaderSkeleton />
                <BookGridSkeleton />
            </section>

            <TrendingSkeleton />

            <FeaturedSkeleton />

            <section>
                <HeaderSkeleton />
                <BookGridSkeleton />
            </section>
        </div>
    );
}