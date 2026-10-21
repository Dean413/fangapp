"use client";

// Report Book (the flag in the reader's side menu)
import { useEffect, useRef, useState } from "react";
import { ChevronDown, UploadCloud, FileText, X } from "lucide-react";
import { toast } from "@/lib/store/toastStore";
import { Modal, REPORT_REASONS, useBusy } from "@/components/reviews/reviewsDialog";
import { useAuthStore } from "@/lib/store/authStore";
import { useAuthModals } from "@/lib/store/auth-card-store";
import { useTranslations } from "next-intl";

const FALLBACK_COVER = "/fang_pictures/bookFace.png";
const MAX_FILES = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_DETAILS = 2000;
const ACCEPT = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

type Props = {
    open: boolean;
    onClose: () => void;
    book: { slug: string; title?: string; author?: string; image?: string | null };
};

const fileSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export default function ReportBookDialog({ open, onClose, book }: Props) {
    const signedIn = useAuthStore((s) => Boolean(s.user));
    const t = useTranslations("Report");
    const rt = useTranslations("ReportReasons");
    const openSignIn = useAuthModals((s) => s.openSignIn);
    const [reason, setReason] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);
    const [link, setLink] = useState("");
    const [details, setDetails] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [dragging, setDragging] = useState(false);
    const [coverFailed, setCoverFailed] = useState(false);
    const input = useRef<HTMLInputElement>(null);
    const { busy, run } = useBusy();

    // A fresh form every time it opens
    useEffect(() => {
        if (!open) return;
        setReason("");
        setMenuOpen(false);
        setLink("");
        setDetails("");
        setFiles([]);
        setDragging(false);
        setCoverFailed(false);
    }, [open]);

    // Signed out: the sign-in card instead of the form
    useEffect(() => {
        if (open && !signedIn) {
            onClose();
            openSignIn();
        }
    }, [open, signedIn, onClose, openSignIn]);

    if (!open || !signedIn) return null;

    const reasonLabel = reason ? rt(reason) : null;

    const addFiles = (list: FileList | null) => {
        if (!list || busy) return;
        const next = [...files];
        for (const file of Array.from(list)) {
            if (next.length >= MAX_FILES) {
                toast.error(t("maxFiles", { max: MAX_FILES }));
                break;
            }
            if (!ACCEPT.includes(file.type)) {
                toast.error(t("badType", { name: file.name }));
                continue;
            }
            if (file.size > MAX_BYTES) {
                toast.error(t("tooBig", { name: file.name }));
                continue;
            }
            if (next.some((f) => f.name === file.name && f.size === file.size)) continue;
            next.push(file);
        }
        setFiles(next);
        if (input.current) input.current.value = "";
    };

    const submit = () => run(async () => {
        if (!reason) return void toast.error(t("selectReason"));
        if (files.length === 0) return void toast.error(t("addEvidence"));
        const link_ = link.trim();
        if (link_ && !/^https?:\/\/\S+$/i.test(link_)) return void toast.error(t("validLink"));

        const form = new FormData();
        form.append("book", book.slug);
        form.append("reason", reason);
        form.append("link", link_);
        form.append("details", details.trim());
        files.forEach((f) => form.append("files", f, f.name));

        const res = await fetch("/api/reports/book", { method: "POST", body: form, credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
            onClose();
            openSignIn();
            return;
        }
        if (!res.ok) return void toast.error(data.message || t("couldntSend"));
        toast.success(data.message || t("sent"));
        onClose();
    });

    const field = "w-full rounded-md border border-gray-300 dark:border-dark-border bg-gray-50 dark:bg-dark px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-neutral-500 outline-none focus:border-gray-400 dark:focus:border-neutral-500";
    const label = "text-sm font-semibold text-gray-600 dark:text-neutral-300";

    return (
        <Modal open onClose={onClose} title={t("title")} busy={busy}>
            {/* The book */}
            <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={!book.image || coverFailed ? FALLBACK_COVER : book.image}
                    onError={() => setCoverFailed(true)}
                    alt=""
                    className="w-12 h-16 object-cover rounded-sm shrink-0"
                />
                <div className="min-w-0">
                    <p className="text-base text-gray-900 dark:text-white truncate">{book.title}</p>
                    <p className="text-xs text-gray-700 dark:text-neutral-300 truncate">{t("author", { author: book.author || t("unknown") })}</p>
                </div>
            </div>

            {/* Violation reason */}
            <p className={`mt-6 ${label}`}>{t("reason")}</p>
            <div className="relative mt-2">
                <button type="button" onClick={() => setMenuOpen((o) => !o)} disabled={busy}
                    className={`${field} flex items-center justify-between text-left`}>
                    <span className={reasonLabel ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-neutral-500"}>
                        {reasonLabel ?? t("selectReasonPlaceholder")}
                    </span>
                    <ChevronDown size={18} className={`text-gray-700 dark:text-neutral-300 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
                </button>
                {menuOpen && (
                    <div className="absolute z-10 left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-md border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-lg">
                        {REPORT_REASONS.map((r) => (
                            <button key={r.code} type="button"
                                onClick={() => { setReason(r.code); setMenuOpen(false); }}
                                className={`w-full text-left px-3 py-2 text-sm border-b last:border-0 border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-raised ${reason === r.code ? "text-red-600 font-semibold" : "text-gray-800 dark:text-neutral-200"}`}>
                                {rt(r.code)}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Link to the original work */}
            <p className={`mt-5 ${label}`}>{t("link")}</p>
            <input
                type="url"
                inputMode="url"
                value={link}
                onChange={(e) => setLink(e.target.value.slice(0, 500))}
                disabled={busy}
                placeholder={t("linkPlaceholder")}
                className={`mt-2 ${field}`}
            />

            {/* Description */}
            <p className={`mt-5 ${label}`}>{t("description")}</p>
            <div className="relative mt-2">
                <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value.slice(0, MAX_DETAILS))}
                    disabled={busy}
                    rows={3}
                    placeholder={t("descriptionPlaceholder")}
                    className={`${field} resize-none pb-6 bg-white dark:bg-dark`}
                />
                <span className="absolute bottom-2 right-3 text-[10px] text-gray-400 dark:text-neutral-500">{details.length}/{MAX_DETAILS}</span>
            </div>

            {/* Supporting evidence */}
            <p className={`mt-5 ${label}`}>{t("evidence")}</p>
            <button
                type="button"
                disabled={busy || files.length >= MAX_FILES}
                onClick={() => input.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
                className={`mt-2 w-full rounded-xl border px-4 py-8 sm:py-10 flex flex-col items-center justify-center gap-3 transition disabled:cursor-not-allowed
                    ${dragging ? "border-red-400 bg-red-50 dark:bg-red-500/10" : "border-gray-300 dark:border-dark-border bg-white dark:bg-dark"}`}>
                <UploadCloud size={36} className="text-gray-500 dark:text-neutral-400" />
                <span className="text-sm text-gray-500 dark:text-neutral-400">
                    {files.length >= MAX_FILES ? t("filesAdded", { count: MAX_FILES }) : t("upload")}
                </span>
                <span className="text-[11px] text-gray-400 dark:text-neutral-500">{t("uploadHint", { max: MAX_FILES })}</span>
            </button>
            <input
                ref={input}
                type="file"
                multiple
                accept={ACCEPT.join(",")}
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
            />

            {files.length > 0 && (
                <ul className="mt-3 space-y-2">
                    {files.map((f, i) => (
                        <li key={`${f.name}-${f.size}`} className="flex items-center gap-3 rounded-md border border-gray-200 dark:border-dark-border px-3 py-2">
                            <FileText size={18} className="shrink-0 text-gray-500 dark:text-neutral-400" />
                            <span className="min-w-0 flex-1 truncate text-sm text-gray-800 dark:text-neutral-200">{f.name}</span>
                            <span className="shrink-0 text-xs text-gray-400 dark:text-neutral-500">{fileSize(f.size)}</span>
                            <button type="button" disabled={busy} aria-label={t("removeFile", { name: f.name })}
                                onClick={() => setFiles((list) => list.filter((_, j) => j !== i))}
                                className="shrink-0 p-1 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-raised">
                                <X size={16} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <div className="mt-8 flex justify-center">
                <button type="button" onClick={submit} disabled={busy}
                    className="w-full sm:w-[80%] rounded-full bg-[#D90404] hover:bg-red-700 transition py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                    {busy ? t("sending") : t("submit")}
                </button>
            </div>
        </Modal>
    );
}


