// Post text with #hashtags coloured
export default function Body({ text }: { text: string }) {
    return (
        <p className="text-gray-800 dark:text-neutral-100 text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
            {text.split(/(#[A-Za-z0-9_]{2,30})/g).map((part, i) =>
                i % 2 ? <span key={i} className="text-rose-500 font-medium">{part}</span> : part
            )}
        </p>
    );
}