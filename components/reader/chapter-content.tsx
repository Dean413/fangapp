"use client";
import UnlockCard, { type UnlockCardProps } from "./unlock-card";

interface Props {
    content: string; // cleaned HTML from the server (lib/chapterHtml.ts)
    locked: boolean;
    unlock: UnlockCardProps; // the unlock card's details (shown when locked)
}

// Top-level blocks of the cleaned HTML (the server strips all attributes, so tags are plain)
const BLOCK = /<(p|h1|h2|h3|blockquote|ul|ol)>[\s\S]*?<\/\1>|<hr\s*\/?>/g;

// Locked chapters: the server only sends a preview. Show its first half clearly and blur the rest.
function splitPreview(html: string): [string, string] {
    const blocks = html.match(BLOCK) ?? [];
    if (blocks.length < 2) return [html, ""];
    const half = Math.ceil(blocks.length / 2);
    return [blocks.slice(0, half).join(""), blocks.slice(half).join("")];
}

// Styles for the Tiptap HTML. Sizes are in em so they follow the reader's font size setting.
const PROSE = [
    "font-serif leading-9 break-words",
    "[&_p]:mb-5 [&_p:empty]:min-h-[1em]",
    "[&_h1]:text-[1.5em] [&_h1]:font-bold [&_h1]:leading-snug [&_h1]:mt-8 [&_h1]:mb-4",
    "[&_h2]:text-[1.3em] [&_h2]:font-bold [&_h2]:leading-snug [&_h2]:mt-7 [&_h2]:mb-3",
    "[&_h3]:text-[1.15em] [&_h3]:font-semibold [&_h3]:leading-snug [&_h3]:mt-6 [&_h3]:mb-3",
    "[&_strong]:font-bold [&_b]:font-bold [&_em]:italic [&_i]:italic [&_u]:underline [&_s]:line-through",
    "[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_ul]:mb-5 [&_ol]:mb-5 [&_li]:mb-2 [&_li>p]:mb-0",
    "[&_blockquote]:border-l-4 [&_blockquote]:border-current/25 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:opacity-90 [&_blockquote]:mb-5",
    "[&_hr]:my-8 [&_hr]:border-current [&_hr]:opacity-25",
].join(" ");

export default function ChapterContent({ content, locked, unlock }: Props) {
    const [preview, lockedPart] = locked ? splitPreview(content ?? "") : ["", ""];

    return (
        <div style={{ fontSize: "var(--font-size)", } as React.CSSProperties}>
            {/* Locked */}
            {locked ? (
                <>
                    <div className={PROSE} dangerouslySetInnerHTML={{ __html: preview }} />

                    {lockedPart && (
                        // blurred paragraphs, fading out (works on every reader theme)
                        <div
                            className={`${PROSE} select-none blur-[1px] opacity-40 pointer-events-none mask-[linear-gradient(to_bottom,black,transparent)]`}
                            aria-hidden="true"
                            dangerouslySetInnerHTML={{ __html: lockedPart }}
                        />
                    )}

                    <UnlockCard {...unlock} />
                </>
            ) : (
                <div className={PROSE} dangerouslySetInnerHTML={{ __html: content ?? "" }} />
            )}
        </div>
    );
}