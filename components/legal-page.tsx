// components/legal-page.tsx
// The info and legal pages (About, Terms, Privacy, Refund, Cookies, DMCA, Community Guidelines, FAQ).
// Their texts live in messages/legal/<locale>.json and are read on the server only, so they never
// go into the messages every page sends to the browser. Missing language: English.
// Inline <b>…</b>, <em>…</em> and <br></br> in the texts become real tags.
import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";

type Block =
    | { t: "h1" | "h2" | "h3" | "p"; cls?: string; text: string }
    | { t: "ul" | "ol"; cls?: string; items: string[] }
    | { t: "br" }
    | { t: "div"; cls?: string; blocks: Block[] };

type LegalDoc = { title: string; blocks: Block[] };

export type LegalKey = "about" | "communityGuidelines" | "dmca" | "privacy" | "refund" | "terms" | "faq" | "cookies";

type LegalFile = Record<LegalKey, LegalDoc> & { notice?: string };

// Binding documents: translated versions say the English text is the one that counts
const BINDING: LegalKey[] = ["communityGuidelines", "dmca", "privacy", "refund", "terms", "cookies"];

async function loadDocs(locale: string): Promise<LegalFile> {
    try {
        return (await import(`@/messages/legal/${locale}.json`)).default;
    } catch {
        return (await import("@/messages/legal/en.json")).default as unknown as LegalFile;
    }
}

function rich(text: string): ReactNode[] {
    const out: ReactNode[] = [];
    const tags = /<(b|em)>([\s\S]*?)<\/\1>|<br><\/br>/g;
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = tags.exec(text))) {
        if (match.index > last) out.push(text.slice(last, match.index));
        const key = out.length;
        out.push(match[1] === "b" ? <b key={key}>{match[2]}</b> : match[1] === "em" ? <em key={key}>{match[2]}</em> : <br key={key} />);
        last = tags.lastIndex;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
}

function render(block: Block, key: number): ReactNode {
    switch (block.t) {
        case "br":
            return <br key={key} />;
        case "div":
            return <div key={key} className={block.cls}>{block.blocks.map(render)}</div>;
        case "ul":
        case "ol": {
            const List = block.t;
            return <List key={key} className={block.cls}>{block.items.map((item, i) => <li key={i}>{rich(item)}</li>)}</List>;
        }
        default: {
            const Tag = block.t;
            return <Tag key={key} className={block.cls}>{rich(block.text)}</Tag>;
        }
    }
}

export default async function LegalPage({ doc }: { doc: LegalKey }) {
    const locale = await getLocale();
    const docs = await loadDocs(locale);
    const page = docs[doc];

    return (
        <div className="w-full flex justify-center py-4 md:py-10 bg-gray-50 dark:bg-dark">
            <div className="md:w-[90%] text-black dark:text-white space-y-8 bg-white dark:bg-dark-card p-5 md:p-8">
                <h1 className="text-4xl text-center mb-8 font-bold">{page.title}</h1>
                {locale !== "en" && docs.notice && BINDING.includes(doc) && (
                    <p className="text-sm text-gray-500 dark:text-neutral-400 italic">{docs.notice}</p>
                )}
                {page.blocks.map(render)}
            </div>
        </div>
    );
}
