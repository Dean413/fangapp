
import Image from "next/image";
interface cardProps {
    title: string;
    rank?: string;
    status?: string;
    author: string;
    views?: string;
    genre?: string;
    image: string;
    tags?: string[];
    label?: string;
    summary?: string;
    style?: string;
}

// Corner ribbons (label, then status) across the cover's top-left corner.
// Sizes are in em, so the whole set scales with the text size per screen.
const RIBBON_OFFSETS = [3.4, 5.4]; // distance of each band from the corner, in em

function CornerRibbons({ label, status }: { label?: string; status?: string }) {
    const ribbons = [
        label ? { text: label, color: "bg-red-700" } : null,
        status ? { text: status, color: status === "COMPLETED" ? "bg-green-800" : "bg-red-800" } : null,
    ].filter(Boolean) as { text: string; color: string }[];

    if (ribbons.length === 0) return null;

    return (
        <div className="absolute top-0 left-0 w-[14em] h-[14em] overflow-hidden z-10 pointer-events-none text-[6px] md:text-[8px]">
            {ribbons.map((ribbon, i) => (
                <span
                    key={ribbon.text}
                    style={{ top: `${RIBBON_OFFSETS[i]}em`, left: `${RIBBON_OFFSETS[i]}em` }}
                    className={`absolute w-[18em] -translate-x-1/2 -translate-y-1/2 -rotate-45 py-[0.45em] text-center font-semibold uppercase leading-none tracking-[0.08em] text-white shadow-md ${ribbon.color}`}>
                    {ribbon.text}
                </span>
            ))}
        </div>
    );
}

export const BookCard = (props: cardProps) => {
    const { title, status, author, views, image, label, tags, genre } = props;
    return (
        <div className="rounded-xl overflow-hidden">
            <div className="w-full aspect-3/4 relative overflow-hidden rounded-xl">
                {/* RIBBONS */}
                <CornerRibbons label={label} status={status} />

                <Image src={image} alt={title} fill sizes="(min-width: 1024px) 14vw, (min-width: 768px) 20vw, 33vw" className="object-cover" />
            </div>
            {/* CONTENT */}
            <div className="pt-2 sm:p-3 space-y-1">
                <h3 className="text-xs sm:text-sm font-semibold line-clamp-2 leading-tight text-gray-900 dark:text-white">
                    {title}
                </h3>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-neutral-400 truncate">{author}</p>
                <div className="flex flex-wrap gap-1">
                    {tags?.slice(0, 1).map((g, index) => (
                        <span key={index} className="text-[9px] sm:text-[10px] bg-gray-100 dark:bg-transparent dark:border dark:border-neutral-600 text-gray-600 dark:text-neutral-200 px-1.5 py-0.5 rounded">
                            {g}
                        </span>
                    ))}
                </div>

                {genre && (
                    <span className="rounded-full bg-pink-100 dark:bg-pink-500/15 px-5 py-2 text-sm font-semibold text-pink-700 dark:text-pink-300">
                        {genre}
                    </span>
                )}

                {views && (
                    <p className="text-[10px] sm:text-xs text-gray-400 dark:text-neutral-500">{views} views</p>
                )}
            </div>
        </div>
    );
};

export const Trending = (trending: cardProps) => {
    const { image, title, tags, author, rank, views, summary } = trending;
    return (
        <div className="flex gap-3 justify-between sm:gap-4 bg-white dark:bg-dark-card p-3 sm:p-4 rounded-2xl shadow-md">
            <h1 className={`text-2xl sm:text-3xl ${rank === "02" ? "text-red-500" : "text-gray-400 dark:text-neutral-500"} font-bold flex items-center shrink-0`}>
                {rank}
            </h1>
            <div className="w-16 sm:w-24 aspect-3/4 relative shrink-0 overflow-hidden rounded-lg">
                <Image src={image} alt={title} fill sizes="96px" className="object-cover" />
            </div>
            <div className="flex flex-col justify-center min-w-0">
                <h3 className="font-bold text-sm sm:text-base line-clamp-2 text-gray-900 dark:text-white">
                    {title}
                </h3>
                <p className="text-gray-400 dark:text-neutral-500 text-xs sm:text-sm min-[450px]:block hidden">{summary}</p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-neutral-400 mt-1">by {author}</p>
                <div className="flex gap-1.5 flex-wrap mt-2">
                    {tags?.map((g, index) => (
                        <span key={index} className={`text-[9px] sm:text-[10px] ${index === 0 ? "bg-red-100 dark:bg-red-500/15 text-red-500 dark:text-red-400 font-semibold" : "bg-gray-100 dark:bg-transparent dark:border dark:border-neutral-600 text-gray-800 dark:text-neutral-200"} px-1.5 py-0.5 rounded`}>
                            {g}
                        </span>
                    ))}
                </div>
            </div>
            <div className="flex items-center shrink-0">
                <div className="flex flex-col  justify-end">
                    <p className="text-black dark:text-white font-bold">{views}</p>
                    <p className="text-gray-300 dark:text-neutral-500 text-xs">READS</p>
                </div>

            </div>
        </div>
    );
};

export const Explore = (explore: cardProps) => {
    const { image, title, tags, author } = explore;
    return (
        <div className="md:flex gap-8 sm:gap-4 p-3 sm:p-4 rounded-2xl">
            <div className="w-28 aspect-3/4 relative shrink-0 overflow-hidden rounded-lg">
                <Image src={image} alt={title} fill sizes="112px" className="object-cover" />
            </div>
            <div className="flex flex-col justify-center min-w-0">
                <h3 className="font-bold text-sm sm:text-base line-clamp-2 text-gray-900 dark:text-white">
                    {title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">{author}</p>
                <div className="md:flex flex-wrap gap-1 mt-2">
                    {tags?.slice(0, 1).map((g, index) => (
                        <span key={index} className={`text-[9px] sm:text-[10px] ${index === 0 ? "bg-red-100 dark:bg-red-500/15 text-red-500 dark:text-red-400 font-semibold" : "bg-gray-100 dark:bg-transparent dark:border dark:border-neutral-600 text-gray-800 dark:text-neutral-200"} px-1.5 py-0.5 rounded`}>
                            {g}
                        </span>
                    ))}
                </div>
                {tags && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {tags.map((t, index) => (
                            <span key={index} className="text-[9px] sm:text-[10px] bg-gray-100 dark:bg-transparent dark:border dark:border-neutral-600 text-gray-600 dark:text-neutral-200 px-1.5 py-0.5 rounded">
                                {t}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};