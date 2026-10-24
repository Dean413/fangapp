"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "../Button";
import GenrePicker from "../genreSelectionCard";
import { useAuthStore } from "@/lib/store/authStore";
import { toast } from "@/lib/store/toastStore";

type EditGenresCardProps = {
    open: boolean;
    onClose: () => void;
};

// Changes only the reader's favourite genres (nothing else on the profile is touched).
const EditGenresCard = ({ open, onClose }: EditGenresCardProps) => {
    const t = useTranslations("Profile");
    const c = useTranslations("Common");
    const user = useAuthStore((s) => s.user);
    const fetchUser = useAuthStore((s) => s.fetchUser);

    const [selected, setSelected] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    // Blocks a second click before the page has re-drawn
    const busy = useRef(false);

    // Start from what's saved each time the card opens
    useEffect(() => {
        if (!open || !user) return;
        setSelected(user.genre_ids ?? []);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "auto";
        return () => {
            document.body.style.overflow = "auto";
        };
    }, [open]);

    if (!open || !user) return null;

    const save = async () => {
        if (busy.current) return;
        busy.current = true;
        setSaving(true);
        try {
            const res = await fetch("/api/auth/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ genreIds: selected }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast.error(data.message || t("couldntSaveGenres"));
                return;
            }
            await fetchUser();
            toast.success(t("genresSaved"));
            onClose();
        } catch {
            toast.error(c("networkError"));
        } finally {
            busy.current = false;
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
            <div className="w-128.75 relative max-h-[85vh] sm:max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl shadow-2xl no-scrollbar animate-in fade-in zoom-in duration-300">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={saving}
                    className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
                >
                    <X size={18} />
                </button>

                <div className="w-full px-6 md:px-16 sm:px-6 py-5 sm:py-6">
                    <div className="mb-4 sm:mb-6">
                        <h2 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">{t("editGenres")}</h2>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{t("editGenresHint")}</p>
                    </div>

                    <div className="space-y-4 sm:space-y-5">
                        <GenrePicker selected={selected} onChange={setSelected} />
                        <Button onClick={save} disabled={saving} loading={saving} loadingText={t("saving")} label={t("saveChanges")} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditGenresCard;