"use client"

import LibraryCard from "@/components/cards/library-card"
import Image from "next/image"
import Link from "next/link"
import { useEffect } from "react";
import { useLibraryStore, type LibraryTab } from "@/lib/store/library-store";
import { useAuthStore } from "@/lib/store/authStore";
import { useAuthModals } from "@/lib/store/auth-card-store";
import { useTranslations } from "next-intl";

// Labels: Library.tab_<key>; empty tabs: Library.empty_<key>
const TABS: LibraryTab[] = ["reading", "viewed", "finished"];

const Library = () => {
    const t = useTranslations("Library");

    const library = useLibraryStore((state) => state.library);
    const saved = useLibraryStore((state) => state.saved);
    const tab = useLibraryStore((state) => state.tab);
    const setTab = useLibraryStore((state) => state.setTab);
    const loading = useLibraryStore((state) => state.loading);
    const loaded = useLibraryStore((state) => state.loaded);
    const fetchLibrary = useLibraryStore((state) => state.fetchLibrary);
    const isEditMode = useLibraryStore((state) => state.isEditMode);
    const setEditMode = useLibraryStore((state) => state.setEditMode);
    const removeSelected = useLibraryStore((state) => state.removeSelected);
    const selected = useLibraryStore((state) => state.selected);

    const user = useAuthStore((s) => s.user);
    const authLoading = useAuthStore((s) => s.loading);
    const openSignIn = useAuthModals((s) => s.openSignIn);

    useEffect(() => {
        if (user) fetchLibrary();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    // Signed out
    if (!user && !authLoading) {
        return (
            <div className="bg-gray-50 dark:bg-dark">
                <div className="mx-auto w-[90%]">
                    <h1 className="text-3xl font-bold mt-8">{t("title")}</h1>
                    <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
                        <Image src="/fang_pictures/white-moon.png" alt={t("signIn")} width={200} height={200} className="object-contain hidden dark:block" />
                        <Image src="/fang_pictures/dark-moon.png" alt={t("signIn")} width={200} height={200} className="object-contain dark:hidden" />
                        <h2 className="text-2xl font-bold">{t("signInPrompt")}</h2>
                        <button type="button" onClick={openSignIn} className="bg-red-700 text-white px-6 py-3 rounded">
                            {t("signIn")}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Nothing saved and nothing read yet
    const nothingYet = loaded && tab === "reading" && library.length === 0 && saved.length === 0;

    return (
        <div className="bg-gray-50 dark:bg-dark">
            <div className="mx-auto w-[90%]">

                <h1 className="text-3xl font-bold mt-8">{t("title")}</h1>
                {nothingYet ? (
                    <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
                        <Image src="/fang_pictures/white-moon.png" alt={t("empty")} width={200} height={200} className="object-contain hidden dark:block" />
                        <Image src="/fang_pictures/dark-moon.png" alt={t("empty")} width={200} height={200} className="object-contain dark:hidden" />

                        <h2 className="text-2xl font-bold">{t("shelfWaiting")}</h2>

                        <Link href="/" className="bg-red-700 text-white px-6 py-3 rounded">
                            {t("explore")}
                        </Link>
                    </div>

                ) : (

                    <>
                        <div className="flex justify-between items-center mt-8">
                            <div className="flex gap-4">
                                {TABS.map((key) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => key !== tab && setTab(key)}
                                        className={tab === key ? "font-semibold text-red-600" : "text-gray-500 dark:text-neutral-400"}
                                    >
                                        {t(`tab_${key}`)}
                                    </button>
                                ))}
                            </div>


                            {library.length > 0 && (!isEditMode ? (
                                <button type="button" onClick={() => setEditMode(true)} className="cursor-pointer">
                                    {t("editShelf")}
                                </button>

                            ) : (

                                <div className="space-x-5">
                                    <button type="button" onClick={removeSelected} disabled={selected.length === 0} className={`cursor-pointer ${selected.length === 0 ? "text-red-300" : "text-red-500"}`}>
                                        {t("remove")}
                                    </button>

                                    <button type="button" onClick={() => setEditMode(false)} className="text-gray-400 dark:text-neutral-500 cursor-pointer">
                                        {t("cancel")}
                                    </button>

                                </div>

                            ))}
                        </div>

                        {loading && library.length === 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-8 w-[95%] mx-auto mt-10">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i}>
                                        <div className="w-full aspect-5/7 rounded-lg bg-gray-200 dark:bg-dark-raised animate-pulse" />
                                        <div className="mt-2 h-4 w-3/4 rounded bg-gray-200 dark:bg-dark-raised animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        ) : library.length === 0 ? (
                            <p className="text-gray-500 dark:text-neutral-400 text-center mt-20">{t(`empty_${tab}`)}</p>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-8 w-[95%] mx-auto mt-10">

                                {library.map((book) => (
                                    <LibraryCard key={book.id} {...book} />
                                ))}
                            </div>
                        )}
                    </>
                )}

            </div>
        </div>
    )
}

export default Library