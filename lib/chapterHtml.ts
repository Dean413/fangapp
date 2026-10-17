import sanitizeHtml from "sanitize-html";

/*
 * Chapter text for the reader. Chapters are written in Tiptap (HTML); older ones may be plain text.
 * Everything is cleaned on the server so only safe formatting tags reach the browser
 * (same tags the admin allows).
 */
const ALLOWED_TAGS = ["p", "b", "strong", "i", "em", "u", "s", "br", "ul", "ol", "li", "blockquote", "h1", "h2", "h3", "hr"];

const clean = (html: string) => sanitizeHtml(html, { allowedTags: ALLOWED_TAGS, allowedAttributes: {} });

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const LOOKS_LIKE_HTML = /<\/?(p|br|strong|em|b|i|u|s|h[1-6]|ul|ol|li|blockquote|div|span)\b[^>]*>/i;

// Top-level blocks of cleaned HTML (cleaned tags have no attributes)
const BLOCK = /<(p|h1|h2|h3|blockquote|ul|ol)>[\s\S]*?<\/\1>|<hr\s*\/?>/g;

const countWords = (html: string) => html.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;

// Safe HTML for a chapter. Plain-text chapters become one paragraph per line.
export function chapterHtml(raw: string | null | undefined): string {
    const text = raw ?? "";
    const html = LOOKS_LIKE_HTML.test(text)
        ? text
        : text
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => `<p>${escapeHtml(line)}</p>`)
            .join("");
    return clean(html);
}

// The start of a chapter (about `ratio` of its words), cut at the end of a paragraph so no tag is broken.
export function previewHtml(html: string, ratio: number): string {
    const target = Math.max(1, Math.ceil(countWords(html) * ratio));
    const blocks = html.match(BLOCK) ?? [];

    if (blocks.length === 0) {
        const words = html.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean);
        return clean(`<p>${escapeHtml(words.slice(0, target).join(" "))}</p>`);
    }

    const picked: string[] = [];
    let words = 0;
    for (const block of blocks) {
        picked.push(block);
        words += countWords(block);
        if (words >= target) break;
    }
    return clean(picked.join(""));
}