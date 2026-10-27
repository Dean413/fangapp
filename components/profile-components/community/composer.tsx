"use client";
import { useRef, useState, type ChangeEvent } from "react";
import { BarChart2, Image as ImageIcon, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/lib/store/authStore";
import { useAuthModals } from "@/lib/store/auth-card-store";
import { toast } from "@/lib/store/toastStore";
import { PostAvatar } from "./author";
import PollBuilder from "./pollBuilder";
import { JSON_HEADERS, call } from "@/lib/communityPage/api";
import { MAX_IMAGE, type Post, type Vip } from "@/lib/communityPage/types"

// The "what's on your mind" box: text, one optional image, one optional poll
export default function Composer({ onCreated, vip }: { onCreated: (post: Post) => void; vip: Vip }) {
    const t = useTranslations("Community");
    const user = useAuthStore((s) => s.user);
    const openSignIn = useAuthModals((s) => s.openSignIn);
    const [text, setText] = useState("");
    const [image, setImage] = useState<string | null>(null);
    const [posting, setPosting] = useState(false);
    const [pollOn, setPollOn] = useState(false);
    const [options, setOptions] = useState<string[]>(["", ""]);
    const [days, setDays] = useState(3);
    const busy = useRef(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    const pollValid =
        text.trim().length > 0 &&
        cleanOptions.length >= 2 &&
        new Set(cleanOptions.map((o) => o.toLowerCase())).size === cleanOptions.length;
    const canPost = pollOn ? pollValid : Boolean(text.trim() || image);

    const pick = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > MAX_IMAGE) {
            toast.error(t("imageInvalid"));
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setImage(String(reader.result));
        reader.readAsDataURL(file);
    };

    const submit = async () => {
        if (busy.current || !canPost) return;
        busy.current = true;
        setPosting(true);
        const { ok, data } = await call<{ post: Post }>("/api/community/posts", {
            method: "POST",
            headers: JSON_HEADERS,
            body: JSON.stringify({ body: text, image, poll: pollOn ? { options: cleanOptions, days } : undefined }),
        });
        if (ok && data.post) {
            onCreated(data.post);
            setText("");
            setImage(null);
            setPollOn(false);
            setOptions(["", ""]);
            setDays(3);
        } else {
            toast.error(data.message ?? t("error"));
        }
        busy.current = false;
        setPosting(false);
    };

    if (!user) {
        return (
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-4">
                <button onClick={openSignIn}
                    className="w-full text-left bg-gray-100 dark:bg-dark-raised rounded-full px-4 py-2 text-sm text-gray-400 dark:text-neutral-500">
                    {t("signInToPost")}
                </button>
            </div>
        );
    }

    const firstName = user.username || user.full_name.trim().split(" ")[0];

    return (
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-4">
            <div className="flex items-start gap-3 mb-3">
                <PostAvatar person={{ avatar_url: user.avatar_url ?? null, vip }} name={user.username || user.full_name || ""} size={36} />
                <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={2}
                    placeholder={pollOn ? t("pollQuestion") : t("placeholder", { name: firstName })}
                    className="flex-1 min-w-0 resize-none bg-gray-100 dark:bg-dark-raised rounded-2xl px-4 py-2 text-sm text-gray-700 dark:text-neutral-200 placeholder-gray-400 dark:placeholder-neutral-500 outline-none focus:ring-2 focus:ring-rose-300" />
            </div>

            {pollOn && <PollBuilder options={options} setOptions={setOptions} days={days} setDays={setDays} />}

            {image && (
                <div className="relative mb-3 w-fit">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image} alt="" className="max-h-48 rounded-lg object-cover" />
                    <button onClick={() => setImage(null)} aria-label={t("removeImage")}
                        className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-1">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-dark-border">
                <div className="flex items-center gap-1 min-w-0">
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={pick} />
                    <button onClick={() => fileRef.current?.click()} disabled={posting}
                        className="flex items-center gap-1.5 text-xs whitespace-nowrap text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-dark-raised px-2 py-1.5 rounded-lg transition-colors disabled:opacity-60">
                        <ImageIcon className="w-4 h-4 text-green-500" /> {t("image")}
                    </button>
                    <button onClick={() => setPollOn((v) => !v)} disabled={posting}
                        className={`flex items-center gap-1.5 text-xs whitespace-nowrap px-2 py-1.5 rounded-lg transition-colors disabled:opacity-60 ${pollOn ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600" : "text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-dark-raised"}`}>
                        <BarChart2 className="w-4 h-4 text-blue-500" /> {t("poll")}
                    </button>
                </div>
                <button onClick={submit} disabled={posting || !canPost}
                    className="ml-auto shrink-0 whitespace-nowrap bg-red-700 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 sm:px-5 py-1.5 rounded-full transition-colors">
                    {posting ? t("posting") : t("createPost")}
                </button>
            </div>
        </div>
    );
}