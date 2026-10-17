import Image from "next/image";
import { FaBookmark } from "react-icons/fa";

interface cardDataProps {
    title: string;
    rank?: string;
    author: string;
    views?: string;
    genre?: string;
    image: string;
    label?: string;
    tags: string[];
    summary?: string;
    style?: string;
    status?: string;
    chapter?: number;

}

export const RankingsCard = (rankingsCard: cardDataProps) => {
    const { image, title, genre, author, chapter, tags, summary, status } = rankingsCard

    return (
        <div className={`flex flex-col sm:flex-row gap-4 sm:gap-6 p-3 sm:p-4 rounded-2xl transition border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card border-2"`}>
            {/* Image */}
            <p className="text-gray-300 text-2xl">4</p>
            {image && (
                <div className="w-full sm:w-28 md:w-32 aspect-3/4 relative shrink-0 overflow-hidden rounded-lg">
                    <Image
                        src={image}
                        alt={title}
                        fill
                        className="object-cover"
                    />
                </div>
            )}

            {/* Content */}
            <div className="flex flex-col justify-center min-w-0 flex-1">

                <div className="flex flex-wrap font-semibold gap-2 text-xs mb-3 text-red-700 dark:text-red-400">
                    <p>MAFIA</p> ·
                    <p>DARK ROMANCE</p>
                </div>


                <h3 className="line-clamp-2 font-bold text-black dark:text-white text-2xl"
                >
                    {title}
                </h3>

                <div className="flex flex-wrap gap-2 text-xs mt-1 text-gray-500 dark:text-neutral-400">
                    <p className="text-green-400">{status}</p>
                    <span>· Chapter {chapter}</span>
                    <span>· {author}</span>
                </div>

                <p className="text-gray-700 dark:text-neutral-200 text-sm mt-2 line-clamp-3 sm:line-clamp-none">
                    {summary}
                </p>

                {/* Genres */}
                <div className="flex flex-wrap gap-1 mt-3">
                    {tags.map((g, index) => (
                        <span
                            key={index}
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold
                            ${index === 0
                                    ? "bg-red-100 dark:bg-red-500/15 text-red-500"
                                    : index === 1
                                        ? "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                        : index === 2
                                            ? "bg-pink-100 dark:bg-pink-500/15 text-pink-400"
                                            : index === 3
                                                ? "bg-green-100 dark:bg-green-500/15 text-green-400"
                                                : "bg-gray-100 dark:bg-dark-raised text-gray-700 dark:text-neutral-200"
                                }
                            dark:bg-dark-raised dark:text-neutral-300`}
                        >
                            {g}
                        </span>
                    ))}
                </div>
            </div>


            <div className="flex flex-col md:flex-row gap-2 sm:gap-3 sm:mt-0 items-start">
                <p className="bg-red-700 px-4 py-2 rounded-3xl text-white text-sm sm:text-base text-center">
                    Read now
                </p>

                <p className="bg-gray-200 dark:bg-neutral-800 rounded-full p-2 text-gray-600 dark:text-neutral-300">
                    <FaBookmark size={22} />
                </p>
            </div>

        </div>
    );
};