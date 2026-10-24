"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "@/lib/store/toastStore";
import { Button } from "../Button";
import Input from "../input";
import BioField from "../text-area";
import { useAuthStore } from "@/lib/store/authStore";

type EditProfileCardProps = {
    open: boolean;
    onClose: () => void;
};

// Change the reader's full name, username and About you. The photo is changed with the camera icon on the profile,
// and favourite genres have their own editor.
const EditProfileCard = ({ open, onClose }: EditProfileCardProps) => {
    const user = useAuthStore((s) => s.user);
    const fetchUser = useAuthStore((s) => s.fetchUser);

    const [fullName, setFullName] = useState("");
    const [userName, setUserName] = useState("");
    const [bio, setBio] = useState("");
    const [saving, setSaving] = useState(false);
    // Blocks a second click before the page has re-drawn
    const busy = useRef(false);

    // Fill in what's saved each time the card opens
    useEffect(() => {
        if (!open || !user) return;
        setFullName(user.full_name ?? "");
        setUserName(user.username ?? "");
        setBio(user.bio ?? "");
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
            const res = await fetch("/api/auth/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ fullName: name, username: handle, bio }),
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
                    {/* HEADER */}
                    <div className="mb-4 sm:mb-6">
                        <h2 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">Edit Profile</h2>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Update how other readers see you</p>
                    </div>

                    <div className="space-y-4 sm:space-y-5">
                        <Input label="Full Name" value={fullName} onChange={setFullName} />
                        <Input label="Username" value={userName} onChange={setUserName} />
                        <BioField label="About you" value={bio} onChange={setBio} />
                        <Button onClick={save} disabled={saving} loading={saving} loadingText="Saving..." label="Save Changes" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditProfileCard;