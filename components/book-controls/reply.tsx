"use client";
import CommentSection from "../comments/comment-section";
import RepliesSection from "../comments/comment-section";

interface Props {
    open: boolean;
    chapterId: string;
    onClose: () => void;
}


export default function ReplyPanel({ open, onClose, chapterId }: Props) {

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50">
            <div
                className="absolute inset-0"
                onClick={onClose}
            />

            <div className="absolute right-0 top-0 h-full">
                <CommentSection chapterId={chapterId} />
            </div>
        </div>
    )
}