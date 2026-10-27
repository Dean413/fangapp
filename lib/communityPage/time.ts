// "2 hours ago", "in 3 days" in the reader's language
export function ago(iso: string, locale: string, justNow: string) {
    const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    const units: [Intl.RelativeTimeFormatUnit, number][] = [
        ["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60],
    ];
    for (const [unit, size] of units) {
        if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
    }
    return justNow;
}