"use client";
// components/author/author-header.tsx
// The top card of an author's page: photo, pen name, Verified Author badge, followers and the Follow button.
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { useAuthModals } from "@/lib/store/auth-card-store";
import { toast } from "@/lib/store/toastStore";

type Props = {
    slug: string;
    penName: string;
    image: string | null;
    followers: number;
    following: boolean;
    isSelf: boolean;
};

export default function AuthorHeader({ slug, penName, image, followers: startFollowers, following: startFollowing, isSelf }: Props) {
    const t = useTranslations("Author");
    const locale = useLocale();
    const signedIn = useAuthStore((s) => Boolean(s.user));
    const openSignIn = useAuthModals((s) => s.openSignIn);
    const [followers, setFollowers] = useState(startFollowers);
    const [following, setFollowing] = useState(startFollowing);
    const [busy, setBusy] = useState(false);
    const busyRef = useRef(false);
    const [photoFailed, setPhotoFailed] = useState(false);

    // Signing in or out while on the page: ask the server who follows (the page was drawn for the old account)
    useEffect(() => {
        setFollowers(startFollowers);
        setFollowing(startFollowing);
    }, [startFollowers, startFollowing]);

    const toggle = async () => {
        if (busyRef.current) return;
        if (!signedIn) return openSignIn();
        busyRef.current = true;
        setBusy(true);
        try {
            const res = await fetch(`/api/authors/${encodeURIComponent(slug)}/follow`, {
                method: following ? "DELETE" : "POST",
                credentials: "include",
            });
            const body = await res.json().catch(() => ({}));
            if (res.status === 401) return openSignIn();
            if (!res.ok) {
                toast.error(t("followFailed"));
                return;
            }
            setFollowing(Boolean(body.following));
            if (typeof body.followers === "number") setFollowers(body.followers);
        } catch {
            toast.error(t("followFailed"));
        } finally {
            busyRef.current = false;
            setBusy(false);
        }
    };

    const initial = penName.trim().charAt(0).toUpperCase() || "A";
    const count = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(followers);

    return (
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-transparent dark:bg-dark-card">
            {/* The cover area: just the soft background */}
            <div className="relative h-28 bg-linear-to-b from-white to-red-200 dark:from-dark-card dark:to-red-950/60">
                <div className="absolute left-1/2 -bottom-10 h-24 w-24 -translate-x-1/2 overflow-hidden rounded-full bg-gray-200 ring-4 ring-white dark:bg-dark-raised dark:ring-dark-card">
                    {image && !photoFailed ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image} alt={penName} onError={() => setPhotoFailed(true)} className="h-full w-full object-cover" />
                    ) : (
                        <span className="flex h-full w-full items-center justify-center bg-linear-to-br from-[#8B0000] to-[#D90404] text-3xl font-bold text-white">
                            {initial}
                        </span>
                    )}
                </div>
            </div>

            <div className="px-4 pb-6 pt-12 text-center">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-semibold text-amber-950">
                    <Pencil size={9} aria-hidden="true" />
                    {t("verified")}
                </span>

                <h1 className="mt-2 font-serif text-xl font-bold text-gray-900 dark:text-white">{penName}</h1>

                <p className="mt-3 text-lg font-bold text-gray-900 dark:text-white">{count}</p>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-neutral-400">{t("followers")}</p>

                {!isSelf && (
                    <button
                        type="button"
                        onClick={toggle}
                        disabled={busy}
                        aria-pressed={following}
                        className={`mt-4 min-w-32 rounded-full px-8 py-2 text-sm font-medium transition disabled:opacity-60 ${following
                            ? "border border-red-500 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                            : "bg-red-500 text-white hover:bg-red-600"}`}>
                        {following ? t("following") : t("follow")}
                    </button>
                )}
            </div>
        </section>
    );
}