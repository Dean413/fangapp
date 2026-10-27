"use client";

// The home page's banner carousel: the admin's uploaded banners, newest first.
// Banners fade into each other (no sliding); each one slowly zooms while it's on screen.
// Auto-advances, pauses on hover/touch, swipe on phones, dots to jump.
// A banner with a link opens it when clicked (the site's own pages in the same tab, other sites in a new tab).
// Shows nothing when there are no banners.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Banner = { id: string; desktop: string; mobile: string; link: string | null };

const INTERVAL_MS = 5000;
const FADE_MS = 700;
const SWIPE_PX = 40;

function isInternal(href: string) {
    if (href.startsWith("/")) return true;
    try {
        return new URL(href).origin === window.location.origin;
    } catch {
        return false;
    }
}

export default function BannerCarousel() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const [zoom, setZoom] = useState(false);
    const touchX = useRef<number | null>(null);
    const swiped = useRef(false); // a swipe must not count as a click on the banner's link

    useEffect(() => {
        let alive = true;
        fetch("/api/banners")
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => { if (alive && Array.isArray(data?.banners)) setBanners(data.banners); })
            .catch(() => { });
        return () => { alive = false; };
    }, []);

    useEffect(() => {
        if (banners.length < 2 || paused) return;
        const timer = setInterval(() => setIndex((i) => (i + 1) % banners.length), INTERVAL_MS);
        return () => clearInterval(timer);
    }, [banners.length, paused]);

    // The zoom restarts for each banner as it comes on screen (two frames after the change, so the browser animates it)
    useEffect(() => {
        setZoom(false);
        if (banners.length === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        let second = 0;
        const first = requestAnimationFrame(() => {
            second = requestAnimationFrame(() => setZoom(true));
        });
        return () => {
            cancelAnimationFrame(first);
            cancelAnimationFrame(second);
        };
    }, [index, banners.length]);

    if (banners.length === 0) return null;
    const current = Math.min(index, banners.length - 1);

    const onTouchEnd = (e: React.TouchEvent) => {
        const start = touchX.current;
        touchX.current = null;
        setPaused(false);
        if (start === null) return;
        const dx = e.changedTouches[0].clientX - start;
        if (Math.abs(dx) < SWIPE_PX) return;
        swiped.current = true;
        setIndex((i) => (dx < 0 ? (i + 1) % banners.length : (i - 1 + banners.length) % banners.length));
    };

    const stopIfSwiped = (e: React.MouseEvent) => {
        if (swiped.current) {
            e.preventDefault();
            swiped.current = false;
        }
    };

    return (
        <section
            className="relative mb-8 aspect-2/1 md:aspect-16/5 overflow-hidden rounded-xl bg-gray-100 dark:bg-dark-raised"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onTouchStart={(e) => { swiped.current = false; touchX.current = e.touches[0].clientX; setPaused(true); }}
            onTouchEnd={onTouchEnd}>
            {banners.map((b, i) => {
                const isCurrent = i === current;
                const showing = isCurrent && zoom;
                const picture = (
                    <picture className="block h-full w-full overflow-hidden">
                        <source media="(min-width: 768px)" srcSet={b.desktop} />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={b.mobile}
                            alt=""
                            loading={i === 0 ? "eager" : "lazy"}
                            draggable={false}
                            className="h-full w-full object-cover will-change-transform"
                            style={{
                                transform: showing ? "scale(1.04)" : "scale(1)",
                                // a banner that is fading out keeps its zoom until it has gone, then resets
                                transition: showing ? `transform ${INTERVAL_MS + FADE_MS}ms linear` : `transform 0s linear ${FADE_MS}ms`,
                            }}
                        />
                    </picture>
                );
                return (
                    <div
                        key={b.id}
                        aria-hidden={!isCurrent}
                        className={`absolute inset-0 ${isCurrent ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"}`}
                        style={{
                            // the new banner fades in on top; the old one stays solid underneath and disappears only after that
                            transition: isCurrent ? `opacity ${FADE_MS}ms ease-in-out` : `opacity 0ms linear ${FADE_MS}ms`,
                        }}>
                        {!b.link ? picture : isInternal(b.link) ? (
                            <Link href={b.link} onClick={stopIfSwiped} draggable={false} tabIndex={isCurrent ? 0 : -1} className="block h-full w-full cursor-pointer">{picture}</Link>
                        ) : (
                            <a href={b.link} target="_blank" rel="noopener noreferrer" onClick={stopIfSwiped} draggable={false} tabIndex={isCurrent ? 0 : -1} className="block h-full w-full cursor-pointer">{picture}</a>
                        )}
                    </div>
                );
            })}

            {banners.length > 1 && (
                <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-2">
                    {banners.map((b, i) => (
                        <button
                            key={b.id}
                            type="button"
                            aria-label={String(i + 1)}
                            onClick={() => setIndex(i)}
                            className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-white" : "w-2 bg-white/50"}`}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}