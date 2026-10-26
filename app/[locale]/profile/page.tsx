"use client";

import { CoverImagePicker } from "@/components/cover-photo";
import { ProfileImagePicker } from "@/components/imagePicker";
import { ReadingStats } from "@/components/stat-cards/reading-stats";
import EditProfileCard from "@/components/editProfileCard";
import EditGenresCard from "@/components/profile-components/editGenreCard";
import { Link } from "@/i18n/routing";
import { useAuthStore } from "@/lib/store/authStore";
import { useAuthModals } from "@/lib/store/auth-card-store";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/store/toastStore";
import { FaPen } from "react-icons/fa";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";

type Genre = { id: string; name: string };
type FollowedAuthor = { slug: string; penName: string; image: string | null };

const joinedDate = (iso: string | null | undefined, locale: string) =>
    iso ? new Date(iso).toLocaleDateString(locale, { month: "long", year: "numeric" }) : "";

// Makes a picked cover photo at most 1600px wide and saves it as JPEG, so the upload stays small.
// Works with whatever the cover picker gives (an image data URL or a blob: URL).
const shrinkImage = (src: string, maxWidth = 1600): Promise<string> =>
    new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => {
            const scale = Math.min(1, maxWidth / img.naturalWidth);
            const width = Math.max(1, Math.round(img.naturalWidth * scale));
            const height = Math.max(1, Math.round(img.naturalHeight * scale));
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject(new Error("Canvas not available"));
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = () => reject(new Error("Couldn't read the image"));
        img.src = src;
    });

const ProfilePage = () => {
    const { user, loading, fetchUser } = useAuthStore();
    const openSignIn = useAuthModals((s) => s.openSignIn);
    const t = useTranslations("Profile");
    const c = useTranslations("Common");
    const locale = useLocale();

    // The cover being uploaded, shown straight away until the saved one comes back
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [genresOpen, setGenresOpen] = useState(false);
    // Completed books (from the reading stats) and the authors the reader follows
    const [bookReads, setBookReads] = useState(0);
    const [followed, setFollowed] = useState<FollowedAuthor[]>([]);
    const [followedTotal, setFollowedTotal] = useState(0);
    // One photo upload at a time
    const photoBusy = useRef(false);
    const coverBusy = useRef(false);
    const [genres, setGenres] = useState<Genre[]>([]);
    // The reader's VIP plan, for the crown next to their name
    const signedIn = !!user;
    const [vipPlan, setVipPlan] = useState<"weekly" | "monthly" | null>(null);
    useEffect(() => {
        if (!signedIn) {
            setVipPlan(null);
            return;
        }
        let alive = true;
        fetch("/api/vip/status", { credentials: "include", cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((body) => {
                if (!alive) return;
                const s = body?.vip ?? body;
                setVipPlan(s?.active && (s.plan === "weekly" || s.plan === "monthly") ? s.plan : null);
            })
            .catch(() => { });
        return () => {
            alive = false;
        };
    }, [signedIn]);
    // Genre names for the reader's saved genre IDs
    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        fetch("/api/genres")
            .then((res) => res.json())
            .then((data) => { if (!cancelled) setGenres(Array.isArray(data.genres) ? data.genres : []); })
            .catch(() => { if (!cancelled) setGenres([]); });
        return () => { cancelled = true; };
    }, [user]);

    // Authors the reader follows
    useEffect(() => {
        if (!signedIn) {
            setFollowed([]);
            setFollowedTotal(0);
            return;
        }
        let alive = true;
        fetch("/api/authors/following", { credentials: "include", cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((body) => {
                if (!alive || !body) return;
                setFollowed(Array.isArray(body.authors) ? body.authors : []);
                setFollowedTotal(Number(body.total) || 0);
            })
            .catch(() => { });
        return () => {
            alive = false;
        };
    }, [signedIn]);

    // A new photo from the picker is saved straight away
    const changePhoto = async (value: string | null) => {
        if (!value || !value.startsWith("data:image/") || photoBusy.current) return;
        photoBusy.current = true;
        try {
            const res = await fetch("/api/auth/avatar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ image: value }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast.error(data.message || t("couldntSavePhoto"));
                return;
            }
            await fetchUser();
            toast.success(t("photoSaved"));
        } catch {
            toast.error(c("networkError"));
        } finally {
            photoBusy.current = false;
        }
    };

    // A new cover from the picker is made smaller and saved straight away
    const changeCover = async (value: string | null) => {
        if (!value || !/^(data:image\/|blob:)/.test(value) || coverBusy.current) return;
        coverBusy.current = true;
        setCoverPreview(value);
        try {
            const image = await shrinkImage(value);
            const res = await fetch("/api/auth/cover", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ image }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast.error(data.message || t("couldntSaveCover"));
                return;
            }
            await fetchUser();
            toast.success(t("coverSaved"));
        } catch {
            toast.error(t("couldntSaveCoverRetry"));
        } finally {
            coverBusy.current = false;
            setCoverPreview(null);
        }
    };

    if (loading && !user) {
        return (
            <div className="pb-10 mx-auto">
                <div className="bg-white dark:bg-dark-card pb-10 rounded-bl-2xl rounded-br-2xl w-[95%] mx-auto animate-pulse">
                    <div className="h-48 bg-gray-200 dark:bg-neutral-800 rounded-b-2xl" />
                    <div className="w-[92%] mx-auto mt-16 space-y-3">
                        <div className="h-5 w-40 bg-gray-200 dark:bg-neutral-800 rounded" />
                        <div className="h-4 w-56 bg-gray-200 dark:bg-neutral-800 rounded" />
                        <div className="h-4 w-72 bg-gray-200 dark:bg-neutral-800 rounded" />
                    </div>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="pb-10 mx-auto">
                <div className="bg-white dark:bg-dark-card py-16 rounded-2xl w-[95%] mx-auto text-center">
                    <h1 className="text-lg font-semibold">{t("signInPrompt")}</h1>
                    <button
                        type="button"
                        onClick={openSignIn}
                        className="mt-5 bg-red-500 text-white text-sm rounded-full py-2 px-6">
                        {t("signIn")}
                    </button>
                </div>
            </div>
        );
    }

    const displayName = user.full_name || user.username || t("defaultName");
    const handle = user.username ? `@${user.username}` : "";
    const joined = user.joined_at ? t("joined", { date: joinedDate(user.joined_at, locale) }) : "";
    const genreIds = user.genre_ids ?? [];
    const favoriteGenres = genres.filter((g) => genreIds.includes(g.id));

    return (
        <div className="pb-10 mx-auto">

            {/* COVER + PROFILE */}
            <div className="bg-white dark:bg-dark-card pb-10 rounded-bl-2xl rounded-br-2xl w-[95%] mx-auto">
                <div className="relative mb-15">
                    <CoverImagePicker
                        image={coverPreview ?? user.cover_url ?? null}
                        setImage={changeCover}
                        name={displayName}
                    />

                    <div className="absolute left-6 -bottom-12">
                        <ProfileImagePicker
                            image={user.avatar_url ?? null}
                            setImage={changePhoto}
                            name={displayName}
                            isProfilePage
                        />
                    </div>
                </div>

                {/* PROFILE INFO */}
                <div className="w-[92%] mx-auto">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <h1 className="text-2xl md:text-lg font-semibold truncate">{displayName}</h1>
                            {vipPlan && (
                                <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
                                    <Image src={`/fang_pictures/${vipPlan}-vip-crown.png`} width={16} height={16} alt="" className="h-4 w-4 object-contain" />
                                    {t("vip")}
                                </span>
                            )}
                        </div>
                        {/* PC: Edit Profile beside the name */}
                        <button type="button" onClick={() => setEditOpen(true)} className="hidden md:flex items-center gap-2 bg-red-700 text-white text-sm rounded-full py-2 px-4">
                            <FaPen size={12} />
                            {t("editProfile")}
                        </button>
                    </div>

                    {(handle || joined) && (
                        <>
                            {/* Mobile: handle and joined date on their own lines */}
                            <div className="md:hidden mt-3 space-y-1 text-sm text-gray-500 dark:text-neutral-400">
                                {handle && <p>{handle}</p>}
                                {joined && <p>{joined}</p>}
                            </div>
                            {/* PC: one line */}
                            <p className="hidden md:block text-sm text-gray-500 dark:text-neutral-400 mt-1">
                                {[handle, joined].filter(Boolean).join(" • ")}
                            </p>
                        </>
                    )}

                    <p className="mt-4 md:mt-2 text-gray-700 dark:text-neutral-200">
                        {user.bio || <span className="text-gray-400 dark:text-neutral-500">{t("noBio")}</span>}
                    </p>

                    {/* STATS: lines above and below on mobile */}
                    <div className="mt-5 md:mt-6 grid grid-cols-2 w-full md:w-[40%] border-y border-gray-200 dark:border-dark-border py-4 md:border-0 md:py-0 text-center">
                        <div>
                            <p className="font-bold text-xl md:text-lg">{bookReads.toLocaleString(locale)}</p>
                            <p className="text-gray-500 dark:text-neutral-400 text-sm">{t("bookReads")}</p>
                        </div>

                        <div>
                            <p className="font-bold text-xl md:text-lg">{followedTotal.toLocaleString(locale)}</p>
                            <p className="text-gray-500 dark:text-neutral-400 text-sm">{t("following")}</p>
                        </div>
                    </div>

                    {/* Mobile: Edit Profile full width at the bottom */}
                    <button type="button" onClick={() => setEditOpen(true)} className="md:hidden mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-red-700 py-3 text-sm font-semibold text-white">
                        <FaPen size={12} />
                        {t("editProfile")}
                    </button>
                </div>
            </div>

            {/* CONTENT SECTION */}
            <div className=" mt-10 flex flex-col lg:flex-row gap-8 bg-white dark:bg-transparent pt-8 dark:pt-0 w-[95%] mx-auto">
                {/* AUTHORS */}
                <div className="flex-1 border w-[95%] mx-auto border-gray-300 dark:border-transparent dark:bg-dark-card rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-3">
                        <h1 className="font-semibold">{t("authorsIFollow")}</h1>
                    </div>

                    {followed.length > 0 ? (
                        <div className="flex flex-wrap gap-3">
                            <div className="flex flex-wrap gap-x-6 gap-y-5">
                                {followed.map((a) => (
                                    <Link
                                        key={a.slug}
                                        href={`/authors/${a.slug}`}
                                        className="group flex w-24 flex-col items-center gap-2 text-center">
                                        {a.image ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={a.image} alt="" className="h-24 w-24 rounded-full object-cover" />
                                        ) : (
                                            <span className="flex h-24 w-24 items-center justify-center rounded-full bg-red-500 text-3xl font-semibold text-white">
                                                {a.penName.charAt(0).toUpperCase()}
                                            </span>
                                        )}
                                        <span className="w-full truncate text-sm text-gray-500 dark:text-neutral-400 group-hover:text-red-500">
                                            {a.penName}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 dark:text-neutral-500">{t("noAuthors")}</p>
                    )}
                </div>

                {/* GENRES */}
                <div className="flex-1 w-[95%] mx-auto border border-gray-300 dark:border-transparent dark:bg-dark-card p-6 rounded-2xl">
                    <div className="flex justify-between items-center mb-3">
                        <h1 className="font-semibold">{t("favoriteGenres")}</h1>
                        <button type="button" onClick={() => setGenresOpen(true)} className="text-red-500 text-sm">{t("edit")}</button>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {favoriteGenres.length > 0 ? (
                            favoriteGenres.map((genre) => (
                                <p key={genre.id} className="border border-red-500 text-red-500 dark:border-neutral-400 dark:text-white rounded-full px-3 py-1 text-sm mt-1">
                                    {genre.name}
                                </p>
                            ))
                        ) : (
                            <p className="text-sm text-gray-400 dark:text-neutral-500">{t("noGenres")}</p>
                        )}
                    </div>
                </div>
            </div>

            {/*Reading stats */}
            <div className="w-[95%] mx-auto">
                <ReadingStats onTotal={setBookReads} />
            </div>

            <EditProfileCard open={editOpen} onClose={() => setEditOpen(false)} />
            <EditGenresCard open={genresOpen} onClose={() => setGenresOpen(false)} />

        </div>
    );
};

export default ProfilePage;