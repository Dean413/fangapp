import CommentCard from "./comment-card";
import CommentInput from "./comment-input";

export default function CommentSection({ chapterId }: { chapterId: string }) {

    const replies = [
        {
            id: "1",
            name: "Shawna",
            content: "Shawn doesnt seemed to be in a good mood, but pleased to see him pissed off. Scumbag, he wants it all.",
            createdAt: "2026-05-26 12:17:14",
            likes: 1
        },

        {
            id: "2",
            name: "Shawna",
            content: "Shawn doesnt seemed to be in a good mood, but pleased to see him pissed off. Scumbag, he wants it all.",
            createdAt: "2026-05-26 12:17:14",
            likes: 1
        },

        {
            id: "3",
            name: "Shawna",
            content: "Shawn doesnt seemed to be in a good mood, but pleased to see him pissed off. Scumbag, he wants it all.",
            createdAt: "2026-05-26 12:17:14",
            likes: 1
        },

        {
            id: "4",
            name: "Shawna",
            content: "Shawn doesnt seemed to be in a good mood, but pleased to see him pissed off. Scumbag, he wants it all.",
            createdAt: "2026-05-26 12:17:14",
            likes: 1
        },

        {
            id: "5",
            name: "Shawna",
            content: "Shawn doesnt seemed to be in a good mood, but pleased to see him pissed off. Scumbag, he wants it all.",
            createdAt: "2026-05-26 12:17:14",
            likes: 1
        },
    ]

    return (
        <div className="w-80 md:w-105 fixed right-5 md:right-15 top-1/2 -translate-y-1/2 bg-white dark:bg-dark-card rounded-xl shadow-xl p-4 z-50">
            <div className="py-4 border-b border-gray-300 dark:border-neutral-700">
                <h3 className="font-semibold text-black dark:text-white text-lg">
                    Comments ({replies.length})
                </h3>
            </div>


            {/* Comment box */}
            <CommentInput chapterId={chapterId} />
            {/* Replies */}
            <div className="max-h-60 overflow-y-auto">
                {
                    replies.map(reply => (
                        <CommentCard
                            key={reply.id}
                            comment={reply}
                        />
                    ))
                }
            </div>


        </div>
    )

}