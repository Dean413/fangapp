"use client";

// components/author/author-book-cover.tsx
// A book cover on the author's page: the site logo while it loads, the default cover if it fails.
import { useEffect, useState } from "react";
import Image from "next/image";
import Imprint from "@/components/imprint";

const FALLBACK_COVER = "/fang_pictures/bookFace.png";

export default function AuthorBookCover({ src, alt }: { src: string; alt: string }) {
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [src]);

    return (
        <div className="relative aspect-3/4 w-24 shrink-0 overflow-hidden rounded-lg sm:w-28">
            <div className="absolute inset-0 flex items-center justify-center animate-pulse bg-gray-200 dark:bg-dark-raised">
                <Image src="/fanglogo1.svg" alt="" aria-hidden="true" width={64} height={64} className="h-auto w-1/3 max-w-16 opacity-40" />
            </div>
            <Image
                src={!src || failed ? FALLBACK_COVER : src}
                alt={alt}
                fill
                unoptimized
                sizes="112px"
                onError={() => setFailed(true)}
                className="object-cover"
            />
            <Imprint size="sm" />
        </div>
    );
}