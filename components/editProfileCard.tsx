"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "./Button";
import Input from "./input";
import { ProfileImagePicker } from "./imagePicker";
import GenrePicker from "./genreSelectionCard";
import { useAuthStore } from "@/lib/store/authStore";

type EditProfileCardProps = {
    open: boolean;
    onClose: () => void;
};

// Add or change everything on the reader's profile: photo, full name, username, About you, favourite genres.
// Also covers readers who skipped step 3 of sign-up.
const EditProfileCard = ({ open, onClose }: EditProfileCardProps) => {
    const user = useAuthStore((s) => s.user);
    const fetchUser = useAuthStore((s) => s.fetchUser);

    const [image, setImage] = useState<string | null>(null);
    const [fullName, setFullName] = useState("");
    const [userName, setUserName] = useState("");
    const [bio, setBio] = useState("");
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    // Blocks a second click before the page has re-drawn
    const busy = useRef(false);

    // Fill in what's saved each time the card opens
    useEffect(() => {
        if (!open || !user) return;
        setImage(user.avatar_url ?? null);
        setFullName(user.full_name ?? "");
        setUserName(user.username ?? "");
        setBio(user.bio ?? "");
        setSelectedGenres(user.genre_ids ?? []);
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
        const name = fullName.replace(/\s+/g, " ").trim();
        const handle = userName.trim();
        if (name.length < 2) {
            toast.error("Please enter your full name");
            return;
        }
        if (!/^[A-Za-z0-9_]{3,20}$/.test(handle)) {
            toast.error("Username must be 3–20 letters, numbers or _ (no spaces)");
            return;
        }
        if (bio.trim().length > 300) {
            toast.error("About you can be at most 300 characters");
            return;
        }

        busy.current = true;
        setSaving(true);
        try {
            // A newly chosen photo (the picker gives it as an image data URL)
            if (image && image.startsWith("data:image/")) {
                const photo = await fetch("/api/auth/avatar", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ image }),
                });
                const photoData = await photo.json().catch(() => ({}));
                if (!photo.ok) {
                    toast.error(photoData.message || "Couldn't save your photo");
                    return;
                }
                setImage(photoData.avatar_url ?? null);
            }

            const res = await fetch("/api/auth/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ fullName: name, username: handle, bio, genreIds: selectedGenres }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast.error(data.message || "Couldn't save your profile");
                return;
            }

            await fetchUser();
            toast.success("Profile updated");
            onClose();
        } catch {
            toast.error("Unable to reach the server. Please try again.");
        } finally {
            busy.current = false;
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
            <div className="w-128.75 relative max-h-[85vh] sm:max-h-[90vh] overflow-y-auto bg-white dark:bg-dark-card rounded-2xl sm:rounded-3xl shadow-2xl no-scrollbar animate-in fade-in zoom-in duration-300">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={saving}
                    className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-raised transition"
                >
                    <X size={18} />
                </button>

                <div className="w-full px-6 md:px-16 sm:px-6 py-5 sm:py-6">
                    {/* HEADER */}
                    <div className="mb-4 sm:mb-6">
                        <h2 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">Edit Profile</h2>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-neutral-400">Update how other readers see you</p>
                    </div>

                    <div className="space-y-4 sm:space-y-5">
                        <ProfileImagePicker image={image} setImage={setImage} name={fullName || userName} uploadIcon="Change Photo" pictureHeader="Profile Photo" />
                        <Input label="Full Name" value={fullName} onChange={setFullName} />
                        <Input label="Username" value={userName} onChange={setUserName} />
                        <h1 className="text-sm sm:text-base font-semibold text-gray-700 dark:text-neutral-300">Favourite Genres</h1>
                        <GenrePicker selected={selectedGenres} onChange={setSelectedGenres} bio={bio} setBio={setBio} />
                        <Button onClick={save} disabled={saving} loading={saving} loadingText="Saving..." label="Save Changes" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditProfileCard;