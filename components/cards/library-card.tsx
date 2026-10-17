"use client"

import Image from "next/image";
import Link from "next/link";
import { useLibraryStore } from "@/lib/store/library-store";


type Props = {
    id: string;
    title: string;
    image: string;
    href?: string;                // the last chapter read (or chapter 1)
    lastChapter?: number | null;
    chapterCount?: number;
}


export default function LibraryCard({
    id,
    title,
    image,
    href,
    lastChapter,
    chapterCount,
}: Props) {


    const isEditMode = useLibraryStore(
        (state) => state.isEditMode
    );


    const selected = useLibraryStore(
        (state) => state.selected
    );


    const toggleSelect = useLibraryStore(
        (state) => state.toggleSelect
    );


    const checked = selected.includes(id);


    const cover = (
        <Image
            src={image}
            alt={title}
            width={200}
            height={280}
            unoptimized
            className="rounded-lg object-cover"
        />
    );


    return (

        <div className="relative">


            <div className="relative">


                {/* Tap to continue reading; in edit mode, tap to select */}
                {isEditMode ? (
                    <button type="button" onClick={() => toggleSelect(id)} className="block w-full cursor-pointer">
                        {cover}
                    </button>
                ) : href ? (
                    <Link href={href}>{cover}</Link>
                ) : (
                    cover
                )}



                {isEditMode && (

                    <button

                        type="button"

                        onClick={() => toggleSelect(id)}

                        className={`
                            absolute 
                            top-2 
                            right-2
                            w-6
                            h-6
                            rounded-full
                            border-2
                            flex
                            items-center
                            justify-center
                            cursor-pointer

                            ${checked
                                ?
                                "bg-red-600 border-red-600"
                                :
                                "bg-white dark:bg-dark-card border-gray-400 dark:border-neutral-600"
                            }

                        `}
                    >

                        {checked && (
                            <span className="text-white text-sm">
                                ✓
                            </span>
                        )}

                    </button>

                )}


            </div>


            <h3 className="mt-2 font-semibold">
                {title}
            </h3>

            {lastChapter != null && (
                <p className="text-xs text-gray-500 dark:text-neutral-400">
                    Chapter {lastChapter}{chapterCount ? ` of ${chapterCount}` : ""}
                </p>
            )}


        </div>

    )
}