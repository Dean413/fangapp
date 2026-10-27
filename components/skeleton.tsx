import Image from "next/image";

// Loading placeholders (light + dark)
const BONE = "animate-pulse rounded bg-gray-200 dark:bg-dark-raised";

export function Bone({ className = "" }: { className?: string }) {
    return <div className={`${BONE} ${className}`} />;
}

// The site logo in the middle of a loading book cover
function SkeletonLogo() {
    return (
        <Image src="/fanglogo1.svg" alt="" aria-hidden="true" width={64} height={64} className="w-1/3 max-w-16 h-auto opacity-40" />
    );
}

// A loading book cover: grey pulsing block with the site logo in the middle
export function CoverBone({ className = "" }: { className?: string }) {
    return (
        <div className={`${BONE} relative flex items-center justify-center ${className}`}>
            <SkeletonLogo />
        </div>
    );
}

// Sits behind a cover image (fill) until the image loads over it
export function CoverPlaceholder() {
    return (
        <div className="absolute inset-0 flex items-center justify-center animate-pulse bg-gray-200 dark:bg-dark-raised">
            <SkeletonLogo />
        </div>
    );
}

export function TextSkeleton({ lines = 4 }: { lines?: number }) {
    const widths = ["w-full", "w-11/12", "w-full", "w-4/5", "w-10/12", "w-full", "w-3/4", "w-9/12"];
    return (
        <div className="space-y-3">
            {Array.from({ length: lines }, (_, i) => (
                <Bone key={i} className={`h-4 ${i === lines - 1 ? "w-2/3" : widths[i % widths.length]}`} />
            ))}
        </div>
    );
}

export function ChapterListSkeleton({ count = 12 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: count }, (_, i) => (
                <div key={i} className="p-2">
                    <Bone className={`h-5 ${i % 3 === 0 ? "w-3/4" : i % 3 === 1 ? "w-2/3" : "w-4/5"}`} />
                </div>
            ))}
        </div>
    );
}

// Same widths as BookGrid's cards
export function BookGridSkeleton({ count = 7 }: { count?: number }) {
    return (
        <div className="flex gap-3 sm:gap-4 overflow-hidden pb-2">
            {Array.from({ length: count }, (_, i) => (
                <div key={i} className="flex-none w-[calc(100%/3-18px)] md:w-[calc(100%/5-12px)] lg:w-[calc(100%/7-14px)]">
                    <CoverBone className="w-full aspect-3/4 rounded-xl" />
                    <div className="pt-2 sm:p-3 space-y-2">
                        <Bone className="h-3 w-4/5" />
                        <Bone className="h-3 w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// Chapter heading + text, inside the reader
export function ChapterSkeleton() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Bone className="h-3 w-20" />
                <Bone className="h-5 w-1/3" />
            </div>
            <TextSkeleton lines={6} />
            <TextSkeleton lines={5} />
            <TextSkeleton lines={6} />
        </div>
    );
}

// Whole reader page on first load
export function ReaderSkeleton() {
    return (
        <div className="min-h-screen flex justify-center dark:bg-dark">
            <div className="w-full md:w-[90%] mx-auto px-4 md:px-2 py-8 md:py-10 my-4 md:my-10 rounded-lg bg-white dark:bg-dark-card">
                <div className="flex flex-col items-center mb-6 space-y-3">
                    <Bone className="w-30 h-45 rounded-md" />
                    <Bone className="h-6 w-1/3" />
                    <Bone className="h-4 w-1/5" />
                </div>
                <div className="my-6 border-t border-gray-200 dark:border-dark-border" />
                <ChapterSkeleton />
            </div>
        </div>
    );
}