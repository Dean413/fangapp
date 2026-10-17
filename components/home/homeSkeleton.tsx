import { Bone, BookGridSkeleton } from "@/components/skeleton";

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

// One row of the Top Trending block: rank, cover, title / author / tags, reads
function TrendingRowSkeleton() {
    return (
        <div className="flex items-center gap-3 sm:gap-4 rounded-2xl bg-white dark:bg-dark-card p-3 sm:p-4 shadow-md">
            <Bone className="h-8 w-8 shrink-0" />
            <Bone className="w-16 sm:w-24 aspect-3/4 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
                <Bone className="h-4 w-3/4" />
                <Bone className="h-3 w-1/2" />
                <Bone className="h-3 w-1/3" />
                <div className="flex gap-1.5">
                    <Bone className="h-4 w-12" />
                    <Bone className="h-4 w-10" />
                </div>
            </div>
            <div className="shrink-0 space-y-1.5">
                <Bone className="h-4 w-10" />
                <Bone className="h-3 w-10" />
            </div>
        </div>
    );
}

// Shown while the Home collections load. Same container as HomeCollections, so nothing jumps
// when the real sections arrive: a cover row, the Top Trending block, then more cover rows.
export default function HomeSkeleton() {
    return (
        <div className="w-[90%] mx-auto mt-4 space-y-12">
            <section>
                <HeaderSkeleton />
                <BookGridSkeleton />
            </section>

            <section>
                <HeaderSkeleton />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {Array.from({ length: 6 }, (_, i) => <TrendingRowSkeleton key={i} />)}
                </div>
            </section>

            {[0, 1].map((i) => (
                <section key={i}>
                    <HeaderSkeleton />
                    <BookGridSkeleton />
                </section>
            ))}
        </div>
    );
}