// lib/bookReports.ts
// Readers reporting a book (the flag in the reader). Saved for the admin with the reader's evidence files.
//  - signed-in, active readers only; never their own book; one report per reader per book; at most 5 book reports a day
//  - evidence: 1 to 5 files, PNG / JPEG / WebP / PDF, 5 MB each. The real type is read from the file's first bytes,
//    never from the name or what the browser says. Files are stored under random names in reports/books/<report id>/
//    and their addresses are never sent back to readers.
import "server-only";
import crypto from "crypto";
import { DeleteObjectsCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { dbPool } from "@/lib/db";
import { withTransaction } from "@/lib/auth/transaction";
import { cleanText } from "@/lib/content";
import { REPORT_REASONS } from "@/lib/userActions/reports";
import { s3Client, storageReady, UPLOAD_BUCKET } from "@/lib/storage";
import { msg, type Msg } from "@/lib/i18n";

export const MAX_EVIDENCE_FILES = 5;
export const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;
const MAX_BOOK_REPORTS_A_DAY = 5;

const EXTENSIONS: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
};

function detectType(bytes: Buffer): string | null {
    const starts = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);
    if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
    if (starts([0xff, 0xd8, 0xff])) return "image/jpeg";
    if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
    if (starts([0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf"; // %PDF-
    return null;
}

// The name shown to the admin: no folders, no control characters, at most 150 characters
function cleanFileName(name: string, type: string) {
    const base = name.split(/[\\/]/).pop() ?? "";
    const cleaned = base.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "").trim().slice(0, 150);
    return cleaned || `evidence${EXTENSIONS[type]}`;
}

// Optional link to the original work: http(s) only
function cleanUrl(value: unknown): string | null | false {
    if (typeof value !== "string" || !value.trim()) return null;
    const text = value.trim();
    if (text.length > 500) return false;
    try {
        const url = new URL(text);
        if (url.protocol !== "https:" && url.protocol !== "http:") return false;
        return url.toString();
    } catch {
        return false;
    }
}

export type EvidenceFile = { name: string; bytes: Buffer };
export type BookReportInput = { storyId: string; reason: unknown; originalUrl: unknown; details: unknown; files: EvidenceFile[] };
export type BookReportResult = { ok: true } | { ok: false; status: number; message: Msg };

export async function createBookReport(userId: string, input: BookReportInput): Promise<BookReportResult> {
    const { reason, files } = input;
    if (typeof reason !== "string" || !REPORT_REASONS.some((r) => r.code === reason)) {
        return { ok: false, status: 400, message: "selectViolation" };
    }
    const originalUrl = cleanUrl(input.originalUrl);
    if (originalUrl === false) return { ok: false, status: 400, message: "enterValidLink" };
    const details = cleanText(input.details, 2000);

    if (files.length === 0) return { ok: false, status: 400, message: "addEvidence" };
    if (files.length > MAX_EVIDENCE_FILES) return { ok: false, status: 400, message: msg("maxFiles", { max: MAX_EVIDENCE_FILES }) };

    const checked: { name: string; type: string; bytes: Buffer }[] = [];
    for (const file of files) {
        const type = detectType(file.bytes);
        if (!type || file.bytes.length === 0 || file.bytes.length > MAX_EVIDENCE_BYTES) {
            return { ok: false, status: 400, message: "evidenceTypes" };
        }
        checked.push({ name: cleanFileName(file.name, type), type, bytes: file.bytes });
    }

    // The reader, the book and the limits, before anything is uploaded
    const { rows } = await dbPool.query(
        `SELECT COALESCE(u.account_status, 'active') AS status,
                (SELECT s.user_id FROM stories s WHERE s.id = $2 AND COALESCE(s.is_deleted, false) = false) AS writer_id,
                EXISTS (SELECT 1 FROM book_reports b WHERE b.reporter_id = $1 AND b.story_id = $2) AS already,
                (SELECT count(*)::int FROM book_reports b WHERE b.reporter_id = $1 AND b.created_at > now() - interval '1 day') AS today
         FROM users u WHERE u.id = $1`,
        [userId, input.storyId]
    );
    const r = rows[0];
    if (!r || r.status !== "active") return { ok: false, status: 403, message: "cantSendReports" };
    if (!r.writer_id) return { ok: false, status: 404, message: "storyNotFound" };
    if (r.writer_id === userId) return { ok: false, status: 400, message: "cantReportOwnBook" };
    if (r.already) return { ok: false, status: 409, message: "alreadyReportedBook" };
    if (Number(r.today) >= MAX_BOOK_REPORTS_A_DAY) {
        return { ok: false, status: 429, message: "tooManyReports" };
    }

    if (!storageReady()) {
        console.error("Report evidence upload is not set up: AWS settings missing (lib/storage.ts)");
        return { ok: false, status: 503, message: "reportsUnavailable" };
    }

    // Upload the evidence, then save the report. If saving fails, the uploaded files are removed again.
    const reportId = crypto.randomUUID();
    const uploaded: { key: string; name: string; type: string; size: number }[] = [];
    const removeUploaded = async () => {
        if (uploaded.length === 0) return;
        try {
            await s3Client.send(new DeleteObjectsCommand({
                Bucket: UPLOAD_BUCKET,
                Delete: { Objects: uploaded.map((f) => ({ Key: f.key })) },
            }));
        } catch (error) {
            console.error("Couldn't remove report evidence:", error);
        }
    };

    try {
        for (const file of checked) {
            const key = `reports/books/${reportId}/${crypto.randomUUID()}${EXTENSIONS[file.type]}`;
            await s3Client.send(new PutObjectCommand({
                Bucket: UPLOAD_BUCKET,
                Key: key,
                Body: file.bytes,
                ContentType: file.type,
                ContentDisposition: "attachment",
            }));
            uploaded.push({ key, name: file.name, type: file.type, size: file.bytes.length });
        }

        const saved = await withTransaction(async (client) => {
            const { rows: report } = await client.query(
                `INSERT INTO book_reports (id, reporter_id, story_id, reason, original_url, details)
                 VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''))
                 ON CONFLICT (reporter_id, story_id) DO NOTHING
                 RETURNING id`,
                [reportId, userId, input.storyId, reason, originalUrl, details]
            );
            if (!report[0]) return false;
            for (const f of uploaded) {
                await client.query(
                    `INSERT INTO book_report_files (report_id, s3_key, file_name, content_type, size_bytes)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [reportId, f.key, f.name, f.type, f.size]
                );
            }
            return true;
        });

        if (!saved) {
            await removeUploaded();
            return { ok: false, status: 409, message: "alreadyReportedBook" };
        }
        return { ok: true };
    } catch (error) {
        await removeUploaded();
        throw error;
    }
}