"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";

type NoteBook = { title: string; href: string };
type Props = {
    name: string;
    slug?: string | null;   // the author's page address (null = no author page)
    image?: string | null;
    note: string;
    books?: NoteBook[];     // live books named in the note
    dark?: boolean;         // Dark / Black reading themes
};

const LINK = "break-all font-medium text-[#B91C45] hover:underline";
const TRAILING = /[.,;:!?)\]}]+$/;

// Plain text with the two kinds of links the writer can use: web addresses and titles of other books
function withLinks(note: string, books: NoteBook[]): ReactNode[] {
    const hrefByTitle = new Map(books.map((b) => [b.title.toLowerCase(), b.href]));
    const titles = books
        .map((b) => b.title)
        .sort((a, b) => b.length - a.length)
        .map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const pattern = [
        "https?:\\/\\/[^\\s<>\"']+",
        ...(titles.length ? [`(?<![\\p{L}\\p{N}])(?:${titles.join("|")})(?![\\p{L}\\p{N}])`] : []),
    ].join("|");

    const out: ReactNode[] = [];
    let last = 0;
    let n = 0;
    for (const m of note.matchAll(new RegExp(pattern, "giu"))) {
        const start = m.index ?? 0;
        let text = m[0];
        let tail = "";
        const isUrl = /^https?:/i.test(text);
        if (isUrl) {
            tail = text.match(TRAILING)?.[0] ?? ""; // "see https://x.com." keeps the full stop out of the link
            text = text.slice(0, text.length - tail.length);
        }
        if (start > last) out.push(note.slice(last, start));
        out.push(
            isUrl ? (
                <a key={n++} href={text} target="_blank" rel="noopener noreferrer nofollow ugc" className={LINK}>{text}</a>
            ) : (
                <Link key={n++} href={hrefByTitle.get(text.toLowerCase()) ?? "#"} className={LINK}>{text}</Link>
            )
        );
        if (tail) out.push(tail);
        last = start + m[0].length;
    }
    if (last < note.length) out.push(note.slice(last));
    return out;
}

// The writer's optional note at the end of a chapter
export default function AuthorNote({ name, slug, image, note, books = [], dark = false }: Props) {
    const t = useTranslations("Author");
    const [failed, setFailed] = useState(false);
    const initial = name.trim().charAt(0).toUpperCase() || "A";
    const nameEl = <span className="block min-w-0 truncate text-base font-bold">{name}</span>;

    return (
        <section className={`mt-8 rounded-xl p-3 md:p-4 ${dark ? "bg-red-500/10" : "bg-red-50"}`}>
            <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-200">
                    {image && !failed ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image} alt={name} onError={() => setFailed(true)} className="h-full w-full object-cover" />
                    ) : (
                        <span className="flex h-full w-full items-center justify-center bg-linear-to-br from-[#8B0000] to-[#D90404] text-lg font-bold text-white">
                            {initial}
                        </span>
                    )}
                </div>

                <div className="flex min-w-0 items-center gap-2">
                    {slug ? <Link href={`/authors/${slug}`} className="min-w-0 hover:underline">{nameEl}</Link> : nameEl}
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-semibold text-amber-950">
                        <Pencil size={9} aria-hidden="true" />
                        {t("verified")}
                    </span>
                </div>
            </div>

            <p className={`mt-3 whitespace-pre-line break-words rounded-lg border px-4 py-3 text-sm ${dark ? "border-white/10 bg-black/20 text-gray-200" : "border-gray-200 bg-white text-gray-800"}`}>
                {withLinks(note, books)}
            </p>
        </section>
    );
}