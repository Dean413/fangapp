import Image from "next/image";

const ContinueReading = () => {
    return (
        <div className="bg-white dark:bg-dark-card p-4 rounded-lg shadow-sm">
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Book Cover */}
                <div className="flex justify-center sm:justify-start">
                    <Image
                        src="/fang_pictures/image 38.png"
                        width={100}
                        height={140}
                        alt="continue"
                        className="rounded-md object-cover"
                    />
                </div>

                {/* Content */}
                <div className="flex-1">
                    <h3 className="text-lg font-semibold">His Mate his Kill</h3>

                    <p className="text-sm text-gray-500 dark:text-neutral-400 mb-2">
                        by veejay
                    </p>

                    <p className="text-sm text-gray-700 dark:text-neutral-200 line-clamp-3">
                        A gripping tale of love, power and impossible choices that has
                        readers captivated chapter after chapter across the FANG
                        community.
                    </p>

                    {/* Progress */}
                    <div className="mt-4">
                        <div className="h-2 w-full md:w-[20%] bg-gray-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <div className="h-full w-[45%] bg-red-500 rounded-full"></div>
                        </div>

                        <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
                            Chapter 45 of 100
                        </p>
                    </div>

                    {/* Button */}
                    <button className="mt-4 text-red-500 font-medium hover:text-red-600">
                        Continue Reading
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ContinueReading;