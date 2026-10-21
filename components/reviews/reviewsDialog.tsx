"use client";

// Popups shared by reviews and comments: confirm, report (Report Comment / Review / Reply), edit review
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { toast } from "@/lib/store/toastStore";
import { Avatar, StarPicker } from "./stars";
import { tc } from "@/lib/i18n-client";
import { useTranslations } from "next-intl";

// The labels are under ReportReasons in messages/*.json
export const REPORT_REASONS = [
    { code: "inappropriate" },
    { code: "sexual" },
    { code: "harassment" },
    { code: "hate" },
    { code: "violence" },
    { code: "child_safety" },
    { code: "copyright" },
    { code: "impersonation" },
    { code: "privacy" },
    { code: "political" },
    { code: "other" },
];

export async function sendJson(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
}

// Blocks a second click before the page has re-drawn
export function useBusy() {
    const ref = useRef(false);
    const [busy, setBusy] = useState(false);
    const run = async (fn: () => Promise<void>) => {
        if (ref.current) return;
        ref.current = true;
        setBusy(true);
        try {
            await fn();
        } catch {
            toast.error(tc("Common.networkError"));
        } finally {
            ref.current = false;
            setBusy(false);
        }
    };
    return { busy, run };
}

export function Modal({ open, onClose, title, busy, children, width = "max-w-xl" }: {
    open: boolean;
    onClose: () => void;
    title: string;
    busy?: boolean;
    children: React.ReactNode;
    width?: string;
}) {
    useEffect(() => {
        if (!open) return;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = "auto"; };
    }, [open]);

    if (!open || typeof document === "undefined") return null;
    // Drawn on the page itself, so a panel around it (e.g. the comments panel) can't squeeze it
    return createPortal(
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4" onClick={() => !busy && onClose()}>
            <div onClick={(e) => e.stopPropagation()}
                className={`w-full ${width} max-h-[90vh] overflow-y-auto bg-white dark:bg-dark-card rounded-2xl border border-transparent dark:border-dark-border shadow-2xl no-scrollbar`}>
                <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-200 dark:border-dark-border">
                    <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
                    <button type="button" onClick={onClose} disabled={busy} aria-label="Close"
                        className="p-1 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-raised">
                        <X size={22} />
                    </button>
                </div>
                <div className="px-5 sm:px-6 py-5">{children}</div>
            </div>
        </div>,
        document.body
    );
}

export function ConfirmDialog({ open, onClose, title, text, confirmLabel, onConfirm }: {
    open: boolean;
    onClose: () => void;
    title: string;
    text: string;
    confirmLabel?: string;
    onConfirm: () => Promise<boolean>;
}) {
    const { busy, run } = useBusy();
    const c = useTranslations("Common");
    const t = useTranslations("Reviews");
    return (
        <Modal open={open} onClose={onClose} title={title} busy={busy} width="max-w-md">
            <p className="text-sm text-gray-600 dark:text-neutral-300">{text}</p>
            <div className="mt-6 flex gap-3 justify-end">
                <button type="button" onClick={onClose} disabled={busy}
                    className="px-5 py-2 rounded-full border border-gray-200 dark:border-dark-border text-sm">
                    {c("cancel")}
                </button>
                <button type="button" disabled={busy}
                    onClick={() => run(async () => { if (await onConfirm()) onClose(); })}
                    className="px-5 py-2 rounded-full bg-red-600 text-white text-sm font-semibold disabled:opacity-60">
                    {busy ? t("pleaseWait") : confirmLabel ?? c("delete")}
                </button>
            </div>
        </Modal>
    );
}

export type ReportTarget = {
    type: "review" | "review_reply" | "comment";
    id: string;
    name: string;
    avatar?: string | null;
    publicId?: string | null;
    status?: string;
    content: string;
};

// Message keys (under Reviews) for the dialog title and the label over the reported text
const REPORT_TITLES: Record<ReportTarget["type"], [string, string]> = {
    review: ["reportReview", "reportedReview"],
    review_reply: ["reportReply", "reportedReply"],
    comment: ["reportComment", "reportedComment"],
};

export function ReportDialog({ target, onClose }: { target: ReportTarget | null; onClose: () => void }) {
    const [reason, setReason] = useState("");
    const [details, setDetails] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);
    const { busy, run } = useBusy();
    const t = useTranslations("Reviews");
    const rp = useTranslations("Report");
    const rt = useTranslations("ReportReasons");

    useEffect(() => {
        setReason("");
        setDetails("");
        setMenuOpen(false);
    }, [target?.id]);

    if (!target) return null;
    const [title, label] = REPORT_TITLES[target.type].map((key) => t(key));
    const reasonLabel = reason ? rt(reason) : null;
    const active = target.status !== "Suspended";

    const submit = () => run(async () => {
        if (!reason) return void toast.error(rp("selectReason"));
        const { ok, data } = await sendJson("/api/reports", "POST", { type: target.type, id: target.id, reason, details });
        if (!ok) return void toast.error(data.message || rp("couldntSend"));
        toast.success(data.message || rp("sent"));
        onClose();
    });

    return (
        <Modal open onClose={onClose} title={title} busy={busy}>
            <div className="flex items-start gap-3">
                <Avatar src={target.avatar} name={target.name} size={48} />
                <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{target.name}</p>
                    {target.publicId && <p className="text-sm text-gray-700 dark:text-neutral-300">{target.publicId}</p>}
                    <span className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${active
                        ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300"}`}>
                        {active ? t("active") : t("suspended")}
                    </span>
                </div>
            </div>

            <div className="mt-5 bg-red-50 dark:bg-red-500/10 p-3 rounded">
                <p className="text-sm font-semibold text-gray-600 dark:text-neutral-300">{label}</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400 whitespace-pre-line line-clamp-6">{target.content}</p>
            </div>

            <p className="mt-5 text-sm font-semibold text-gray-600 dark:text-neutral-300">{rp("reason")}</p>
            <div className="relative mt-2">
                <button type="button" onClick={() => setMenuOpen((o) => !o)} disabled={busy}
                    className="w-full flex items-center justify-between rounded-md border border-gray-300 dark:border-dark-border bg-gray-50 dark:bg-dark px-3 py-2.5 text-sm text-left">
                    <span className={reasonLabel ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-neutral-500"}>
                        {reasonLabel ?? rp("selectReasonPlaceholder")}
                    </span>
                    <ChevronDown size={18} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />
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

            <p className="mt-5 text-sm font-semibold text-gray-600 dark:text-neutral-300">{t("details")}</p>
            <div className="mt-2 relative">
                <textarea value={details} onChange={(e) => setDetails(e.target.value.slice(0, 2000))} disabled={busy}
                    placeholder={t("detailsPlaceholder")}
                    className="w-full min-h-24 resize-none rounded-md border border-gray-300 dark:border-dark-border bg-white dark:bg-dark px-3 py-2 pb-6 text-sm outline-none focus:border-gray-500" />
                <span className="absolute right-3 bottom-3 text-[10px] text-gray-400">{details.length}/2000</span>
            </div>

            <div className="mt-6 flex justify-center">
                <button type="button" onClick={submit} disabled={busy}
                    className="w-full sm:w-4/5 py-2.5 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-60">
                    {busy ? rp("sending") : rp("submit")}
                </button>
            </div>
        </Modal>
    );
}

export const MIN_REVIEW_CHARS = 10;
export const MAX_REVIEW_CHARS = 2000;

// The review form: stars and text. Used on the book page and in My Reviews (edit).
export function ReviewForm({ initialRating = 0, initialContent = "", submitLabel, onSubmit, onCancel }: {
    initialRating?: number;
    initialContent?: string;
    submitLabel: string;
    onSubmit: (rating: number, content: string) => Promise<boolean>;
    onCancel?: () => void;
}) {
    const [rating, setRating] = useState(initialRating);
    const [content, setContent] = useState(initialContent);
    const { busy, run } = useBusy();
    const t = useTranslations("Reviews");
    const c = useTranslations("Common");

    const submit = () => run(async () => {
        if (!rating) return void toast.error(t("chooseRating"));
        if (content.trim().length < MIN_REVIEW_CHARS) return void toast.error(t("minChars", { min: MIN_REVIEW_CHARS }));
        await onSubmit(rating, content);
    });

    return (
        <div>
            <StarPicker value={rating} onChange={setRating} disabled={busy} />
            <div className="mt-3 relative">
                <textarea value={content} onChange={(e) => setContent(e.target.value.slice(0, MAX_REVIEW_CHARS))} disabled={busy}
                    placeholder={t("formPlaceholder")}
                    className="w-full min-h-28 resize-none rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-dark px-4 py-3 pb-7 text-sm outline-none focus:border-black dark:focus:border-white" />
                <span className="absolute right-3 bottom-3 text-[10px] text-gray-400">{content.length}/{MAX_REVIEW_CHARS}</span>
            </div>
            <div className="mt-3 flex justify-end gap-3">
                {onCancel && (
                    <button type="button" onClick={onCancel} disabled={busy}
                        className="px-5 py-2 rounded-lg border border-gray-200 dark:border-dark-border text-sm">
                        {c("cancel")}
                    </button>
                )}
                <button type="button" onClick={submit} disabled={busy}
                    className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-60">
                    {busy ? c("saving") : submitLabel}
                </button>
            </div>
        </div>
    );
}

export function EditReviewDialog({ open, onClose, book, title, rating, content, onSaved }: {
    open: boolean;
    onClose: () => void;
    book: string;
    title: string;
    rating: number;
    content: string;
    onSaved: (review: { rating: number; content: string; updatedAt: string }) => void;
}) {
    const t = useTranslations("Reviews");
    return (
        <Modal open={open} onClose={onClose} title={t("editTitle", { title })}>
            <ReviewForm
                key={open ? "open" : "closed"}
                initialRating={rating}
                initialContent={content}
                submitLabel={t("saveChanges")}
                onCancel={onClose}
                onSubmit={async (r, c) => {
                    const { ok, data } = await sendJson("/api/reviews", "POST", { book, rating: r, content: c });
                    if (!ok) {
                        toast.error(data.message || t("couldntSave"));
                        return false;
                    }
                    toast.success(data.message || t("updated"));
                    onSaved({ rating: data.review.rating, content: data.review.content, updatedAt: data.review.updatedAt });
                    onClose();
                    return true;
                }}
            />
        </Modal>
    );
}