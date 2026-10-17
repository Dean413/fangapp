"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export default function CommentInput({ chapterId }: { chapterId: string }) {
    const [message, setMessage] = useState("");

    const handleSubmit = () => {
        if (!message.trim()) return;

        alert(`${message} sent for chapter ${chapterId}`);

        // later:
        // send to backend/database here

        setMessage("");
    };

    return (
        <div className="flex gap-3 items-start py-4 border-b border-gray-200 dark:border-dark-border">

            {/* User avatar */}
            <div className="w-10 h-10 rounded-full bg-black dark:bg-neutral-700 shrink-0" />

            <div className="flex-1">

                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write a reply..."
                    className="w-full min-h-20 resize-none rounded-lg border border-gray-300 dark:border-neutral-700 px-4 py-3 text-sm outline-none focus:border-black dark:focus:border-white"
                />

                <div className="flex justify-end mt-2">
                    <button onClick={handleSubmit}
                        className="flex items-center gap-2 bg-red-800 text-white px-4 py-2 rounded-lg text-sm hover:opacity-80 transition">
                        Reply
                        <Send size={15} />
                    </button>
                </div>

            </div>

        </div>
    );
}