"use client";

// "Enjoying this book? Drop a review" popup on the reading page.
// When the reader finishes a chapter (scrolls to its end), the page tells the server, which opens the popup
// only for the book's halfway chapter (chapter 20 of 40) and its last chapter, once each per account.
import { useEffect, useRef, useState, type RefObject } from "react";
import { toast } from "@/lib/store/toastStore";
import { Modal, ReviewForm, sendJson } from "./reviewsDialog";
import { useTranslations } from "next-intl";

type Props = {
    book: string;                              // the book's slug
    chapter: number;                           // the open chapter's number
    enabled: boolean;                          // signed in, and the full (unlocked) chapter is on screen
    contentRef: RefObject<HTMLElement | null>; // the chapter text
};

export default function ReviewPrompt({ book, chapter, enabled, contentRef }: Props) {
    const [open, setOpen] = useState(false);
    const t = useTranslations("Reviews");
    // Per chapter: "finished" is sent once (sending = waiting for the answer)
    const sent = useRef<"no" | "sending" | "done">("no");

    useEffect(() => {
        sent.current = "no";
    }, [book, chapter]);

    useEffect(() => {
        if (!enabled || !book || !chapter) return;
        let frame = 0;
        let stopped = false;

        const report = async () => {
            if (sent.current !== "no") return;
            sent.current = "sending";
            try {
                const { ok, data } = await sendJson("/api/reviews/prompt", "POST", { book, chapter });
                if (stopped) return;
                if (!ok) { sent.current = "no"; return; } // try again on the next check
                sent.current = "done";
                if (data.show) setOpen(true);
            } catch {
                sent.current = "no";
            }
        };

        // Finished = scrolled to the end of the chapter text
        const check = () => {
            frame = 0;
            const el = contentRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            if (rect.height <= 0) return;
            if (rect.bottom <= window.innerHeight + 40) report();
        };

        const onScroll = () => { if (!frame) frame = requestAnimationFrame(check); };
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        // Short chapters may never scroll: check every few seconds too
        const timer = setInterval(check, 3000);

        return () => {
            stopped = true;
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
            clearInterval(timer);
            if (frame) cancelAnimationFrame(frame);
        };
    }, [enabled, book, chapter, contentRef]);

    const submit = async (rating: number, content: string) => {
        const { ok, data } = await sendJson("/api/reviews", "POST", { book, rating, content });
        if (!ok) {
            toast.error(data.message || t("couldntSave"));
            return false;
        }
        toast.success(data.message || t("posted"));
        setOpen(false);
        return true;
    };

    return (
        <Modal open={open} onClose={() => setOpen(false)} title={t("promptTitle")}>
            <ReviewForm submitLabel={t("post")} onSubmit={submit} onCancel={() => setOpen(false)} />
        </Modal>
    );
}