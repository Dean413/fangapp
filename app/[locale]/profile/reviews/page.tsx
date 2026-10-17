"use client"
import { Star, Heart, MessageCircle, MoreVertical, Pencil } from "lucide-react";

const reviews = [
    {
        id: 1,
        title: "The Crimson Throne",
        author: "R. J. Hart",
        rating: 4.5,
        ratingLabel: "4.5/5",
        review:
            '"A breathtaking saga with characters that linger long after the final page. The world-building rivals classics of the genre, and the romance subplot caught me completely off guard."',
        date: "Mar 12, 2026",
        likes: 182,
        comments: 28,
    },
    {
        id: 2,
        title: "Moonlit Vows",
        author: "Luna West",
        rating: 5,
        ratingLabel: "5/5",
        review:
            '"My favorite romance of the year. The chemistry is electric, the prose lyrical, and the ending absolutely wrecked me in the best way possible."',
        date: "Feb 28, 2026",
        likes: 421,
        comments: 93,
    },
    {
        id: 3,
        title: "Veil of Embers",
        author: "Cassian Drake",
        rating: 4,
        ratingLabel: "4/5",
        review:
            '"Slow start but the payoff is enormous. The magic system is some of the most original I have read in years."',
        date: "Feb 14, 2026",
        likes: 75,
        comments: 12,
    },
];

function StarRating({ rating }: { rating: number }) {
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => {
                const filled = rating >= star;
                const half = !filled && rating >= star - 0.5;
                return (
                    <div key={star} className="relative w-5 h-5">
                        {/* Empty star */}
                        <Star className="w-5 h-5 text-gray-300 fill-gray-200 dark:fill-neutral-700" />
                        {/* Full or half overlay */}
                        {(filled || half) && (
                            <div className="absolute inset-0 overflow-hidden" style={{ width: half ? "50%" : "100%" }}>
                                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default function MyReviews() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark p-4 sm:p-6">
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                        My Reviews
                    </h1>

                    <div className="flex gap-2">
                        <button className="flex-1 sm:flex-none px-4 sm:px-5 py-2 rounded-full bg-red-500 text-white text-sm font-medium">
                            Reviews
                        </button>

                        <button className="flex-1 sm:flex-none px-4 sm:px-5 py-2 rounded-full bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-sm font-medium text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-dark-raised">
                            Comments
                        </button>
                    </div>
                </div>

                {/* Review Cards */}
                <div className="space-y-4">
                    {reviews.map((r) => (
                        <div
                            key={r.id}
                            className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-4"
                        >
                            <div className="flex flex-col sm:flex-row gap-4">

                                {/* Book Cover */}
                                <div className="w-24 h-32 mx-auto sm:mx-0 shrink-0 rounded-lg overflow-hidden bg-gray-200 dark:bg-neutral-800">
                                    <img
                                        src="/book-cover.jpg"
                                        alt={r.title}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src =
                                                "https://placehold.co/96x128/6b7280/ffffff?text=📖";
                                        }}
                                    />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">

                                    {/* Top */}
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="min-w-0">
                                            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white line-clamp-2">
                                                {r.title}
                                            </h2>

                                            <p className="text-sm text-gray-500 dark:text-neutral-400">
                                                by {r.author}
                                            </p>
                                        </div>

                                        <button className="text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300 shrink-0">
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Rating */}
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <StarRating rating={r.rating} />

                                        <span className="text-sm font-semibold text-gray-700 dark:text-neutral-200">
                                            {r.ratingLabel}
                                        </span>
                                    </div>

                                    {/* Review */}
                                    <p className="text-sm text-gray-600 dark:text-neutral-300 mt-2 leading-relaxed">
                                        {r.review}
                                    </p>

                                    {/* Footer */}
                                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                                        <span className="text-xs text-gray-400 dark:text-neutral-500">
                                            Posted on {r.date}
                                        </span>

                                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-neutral-400">

                                            <span className="flex items-center gap-1">
                                                <Heart className="w-4 h-4 text-red-400" />
                                                {r.likes}
                                            </span>

                                            <span className="flex items-center gap-1">
                                                <MessageCircle className="w-4 h-4" />
                                                {r.comments}
                                            </span>

                                            <button className="flex items-center gap-1 text-red-500 font-medium hover:text-red-600">
                                                <Pencil className="w-4 h-4" />
                                                Edit
                                            </button>

                                        </div>

                                    </div>

                                </div>

                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}