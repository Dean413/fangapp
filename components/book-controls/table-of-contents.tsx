"use client";

import { useRouter } from "next/navigation";
import { FaLock } from "react-icons/fa6";
import { useTranslations } from "next-intl";

export default function TocSheet({ chapters, currentChapter, onClose }: any) {
    const router = useRouter();
    const t = useTranslations("Book");
    const handleClick = (ch: any) => {
        if (ch.isLocked) return;

        router.replace(`?chapter=${ch.chapter_number}`);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex">
            {/* CLICK OUTSIDE */}
            <div className="flex-1" onClick={onClose} />

            {/* PANEL */}
            <div className="w-80 md:w-105 fixed md:right-15 right-5 top-1/2 -translate-y-1/2 bg-white dark:bg-dark-card rounded-xl shadow-xl p-4 z-50">
                <h2 className="text-center border-b border-gray-300 dark:border-neutral-700 pb-3 font-bold mb-4">{t("contents")}</h2>

                <div className="flex flex-col gap-2 max-h-100 overflow-y-auto no-scrollbar">
                    {chapters?.map((ch: any) => (
                        <button disabled={ch.isLocked} key={ch.chapter_number} onClick={() => { router.replace(`?chapter=${ch.chapter_number}`); onClose(); }}
                            className={`text-left px-3 flex ${ch.isLocked ? "opacity-70" : "opacity-100"}  items-center gap-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-dark-raised ${Number(currentChapter) === ch.chapter_number
                                ? "bg-gray-200 dark:bg-neutral-800 font-bold" : ""}`}>

                            {ch.isLocked && (
                                <FaLock className="text-gray-500 dark:text-neutral-400 text-sm" />
                            )}

                            {t("chapterTitled", { chapter: ch.chapter_number, title: ch.title })}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}