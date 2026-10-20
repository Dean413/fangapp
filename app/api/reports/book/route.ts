// app/api/reports/book/route.ts
// POST (form data) book, reason, link?, details?, files (1 to 5 images or PDFs, 5 MB each)   report a book to the admin
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getStoryBySlug } from "@/lib/stories";
import { createBookReport, MAX_EVIDENCE_BYTES, MAX_EVIDENCE_FILES, type EvidenceFile } from "@/lib/bookReports";
import { reply } from "@/lib/auth/rules";

// Whole request: 5 files of 5 MB plus the form fields
const MAX_REQUEST_BYTES = MAX_EVIDENCE_FILES * MAX_EVIDENCE_BYTES + 64 * 1024;

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "Please sign in to report");

    const length = Number(request.headers.get("content-length") || 0);
    if (length > MAX_REQUEST_BYTES) return reply(413, "Evidence must be up to 5 files of 5 MB each");

    let form: FormData;
    try {
        form = await request.formData();
    } catch {
        return reply(400, "Invalid request");
    }

    const book = form.get("book");
    if (typeof book !== "string" || !book.trim() || book.length > 200) return reply(400, "Invalid request");

    const entries = form.getAll("files");
    if (entries.length > MAX_EVIDENCE_FILES) return reply(400, `You can add up to ${MAX_EVIDENCE_FILES} files`);
    const files: EvidenceFile[] = [];
    for (const entry of entries) {
        if (typeof entry === "string") return reply(400, "Invalid request");
        if (entry.size > MAX_EVIDENCE_BYTES) return reply(400, "Each file must be under 5 MB");
        files.push({ name: entry.name || "", bytes: Buffer.from(await entry.arrayBuffer()) });
    }

    try {
        const story = await getStoryBySlug(book.trim());
        if (!story) return reply(404, "Story not found");

        const result = await createBookReport(user.id, {
            storyId: String(story.id),
            reason: form.get("reason"),
            originalUrl: form.get("link"),
            details: form.get("details"),
            files,
        });
        if (!result.ok) return reply(result.status, result.message);
        return reply(200, "Thanks. Our team will review this book.");
    } catch (error) {
        console.error("Book report error:", error);
        return reply(500, "Couldn't send your report. Please try again.");
    }
}