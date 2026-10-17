"use client";

import { ThumbsUp } from "lucide-react";

type Comment = {
    id: string;
    name: string;
    avatar?: string;
    content: string;
    createdAt: string;
    likes: number;
};

export default function CommentCard({ comment }: { comment: Comment }) {
    return (
        <div className="flex gap-3 py-4 border-b border-gray-200 dark:border-dark-border">
            {/* Avatar */}
            <div className="shrink-0">
                <div className="w-10 h-10 rounded-full bg-black dark:bg-neutral-700" />
            </div>

            {/* Content */}
            <div className="flex-1">
                <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{comment.name}</h4>
                </div>

                <p className="text-gray-700 dark:text-neutral-200 mt-1 text-sm leading-relaxed">
                    {comment.content}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between mt-3 text-xs text-gray-500 dark:text-neutral-400">
                    <span>{comment.createdAt}</span>

                    <div className="flex items-center gap-1">
                        <ThumbsUp size={14} />
                        <span>{comment.likes}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}