"use client";

import { useState } from "react";
import { Star } from "lucide-react";

const SIZES = { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-8 h-8" } as const;

// Stars for a rating (half stars shown half filled)
export function StarRating({ rating, size = "md" }: { rating: number; size?: keyof typeof SIZES }) {
    const box = SIZES[size];
    return (
        <div className="flex gap-0.5" aria-label={`${rating} out of 5`}>
            {[1, 2, 3, 4, 5].map((star) => {
                const filled = rating >= star;
                const half = !filled && rating >= star - 0.5;
                return (
                    <div key={star} className={`relative ${box}`}>
                        {/* Empty star */}
                        <Star className={`${box} text-gray-300 fill-gray-200 dark:text-neutral-600 dark:fill-neutral-700`} />
                        {/* Full or half overlay */}
                        {(filled || half) && (
                            <div className="absolute inset-0 overflow-hidden" style={{ width: half ? "50%" : "100%" }}>
                                <Star className={`${box} text-yellow-400 fill-yellow-400`} />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// Picking a rating: tap the left half of a star for a half star, the right half for a whole one
export function StarPicker({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
    const [hover, setHover] = useState<number | null>(null);
    const shown = hover ?? value;
    return (
        <div className="flex items-center gap-3">
            <div className="flex gap-1" onMouseLeave={() => setHover(null)}>
                {[1, 2, 3, 4, 5].map((star) => {
                    const filled = shown >= star;
                    const half = !filled && shown >= star - 0.5;
                    return (
                        <div key={star} className="relative w-8 h-8">
                            <Star className="w-8 h-8 text-gray-300 fill-gray-200 dark:text-neutral-600 dark:fill-neutral-700" />
                            {(filled || half) && (
                                <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ width: half ? "50%" : "100%" }}>
                                    <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                                </div>
                            )}
                            {[star - 0.5, star].map((v, i) => (
                                <button
                                    key={v}
                                    type="button"
                                    disabled={disabled}
                                    aria-label={`${v} stars`}
                                    onMouseEnter={() => setHover(v)}
                                    onFocus={() => setHover(v)}
                                    onBlur={() => setHover(null)}
                                    onClick={() => onChange(v)}
                                    className={`absolute top-0 h-full w-1/2 cursor-pointer disabled:cursor-not-allowed ${i === 0 ? "left-0" : "right-0"}`}
                                />
                            ))}
                        </div>
                    );
                })}
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-neutral-200 min-w-10">
                {shown > 0 ? `${shown}/5` : "Tap to rate"}
            </span>
        </div>
    );
}

// Round photo, or the first letter of the name on red
export function Avatar({ src, name, size = 40 }: { src?: string | null; name: string; size?: number }) {
    const [failed, setFailed] = useState(false);
    const style = { width: size, height: size };
    if (src && !failed) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={src} alt={name} style={style} onError={() => setFailed(true)} className="rounded-full object-cover shrink-0" />;
    }
    return (
        <div style={style} className="rounded-full shrink-0 bg-red-800/80 text-white flex items-center justify-center font-semibold uppercase"
            aria-hidden>
            <span style={{ fontSize: Math.max(12, size * 0.4) }}>{(name || "R").trim().charAt(0)}</span>
        </div>
    );
}

// "2026-05-26 12:17:14" in the reader's time
export function formatDateTime(iso: string) {
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}  ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// "Mar 12, 2026"
export const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });