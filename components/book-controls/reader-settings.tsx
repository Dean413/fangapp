import { BookmarkPlus, BookmarkCheck, Flag, LucideMessageSquareText } from "lucide-react";
import { FaGift } from "react-icons/fa";
import { FaListUl, FaShareNodes } from "react-icons/fa6";
import { FiSettings } from "react-icons/fi";
import { useLibraryStore } from "@/lib/store/library-store";
import { useTranslations } from "next-intl";

// bookId = the book's slug (the reader page passes it)
const ReadingSettings = ({ onOpenSettings, onOpenToc, onClickShare, onOpenGift, onOpenReplies, onOpenReport, bookId, id, title, image, }: any) => {
    const bookKey: string = String(bookId ?? id ?? "");
    const toggleBook = useLibraryStore((state) => state.toggleBook);
    const t = useTranslations("Reader");
    // Re-draws when the saved list changes, so the icon updates straight away
    const saved = useLibraryStore((state) => state.saved.some((b) => b.id === bookKey || b.storyId === bookKey));

    // Saved to the account; the store shows the message (and the sign-in card when signed out)
    const handleBookmark = () => {
        if (!bookKey) return;
        toggleBook({ id: bookKey, title, image });
    };

    return (
        <div>
            <div
                className="fixed z-50 bottom-4 left-1/2 -translate-x-1/2 flex flex-row items-center gap-5
                rounded-full bg-white dark:bg-dark-card px-5 py-3 shadow-xl
                md:top-1/2 md:right-4 md:bottom-auto md:left-auto
                md:translate-x-0 md:-translate-y-1/2
                md:flex-col md:gap-4
                md:rounded-lg md:px-2 md:py-4">
                <button type="button" onClick={onOpenToc}>
                    <FaListUl size={20} className="text-black dark:text-white" />
                </button>

                <button type="button" onClick={onOpenSettings}>
                    <FiSettings size={20} className="text-black dark:text-white" />
                </button>

                <button type="button" onClick={onOpenReplies}>
                    <LucideMessageSquareText size={20} className="text-black dark:text-white" />
                </button>

                <button type="button" onClick={onClickShare}>
                    <FaShareNodes size={20} className="text-black dark:text-white" />
                </button>

                <button type="button" onClick={onOpenGift}>
                    <FaGift size={20} className="text-black dark:text-white" />
                </button>

                <button type="button" onClick={handleBookmark}>
                    {saved ? (
                        <BookmarkCheck size={20} className="text-red-500" />
                    ) : (
                        <BookmarkPlus size={20} className="text-black dark:text-white" />
                    )}
                </button>

                {/* Report Book */}
                <button type="button" onClick={onOpenReport} aria-label={t("reportBook")}>
                    <Flag size={20} className="text-black dark:text-white" />
                </button>
            </div>
        </div>
    );
};

export default ReadingSettings