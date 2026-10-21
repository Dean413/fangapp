// lib/reports.ts
// Readers reporting a review, a reply to a review, or a chapter comment. Saved for the admin to look at.
// One report per reader per thing; nobody can report their own; at most 20 reports a day per reader.
import "server-only";
import { dbPool } from "@/lib/db";
import { cleanText, UUID } from "@/lib/content";
import { type Msg } from "@/lib/i18n";

export const REPORT_REASONS = [
    { code: "inappropriate", label: "Inappropriate Content" },
    { code: "sexual", label: "Sexual or Obscene Content" },
    { code: "harassment", label: "Harassment, Bullying or Personal Attacks" },
    { code: "hate", label: "Hate Speech or Discrimination" },
    { code: "violence", label: "Violence or Threats" },
    { code: "child_safety", label: "Child Safety Violation" },
    { code: "copyright", label: "Copyright Infringement or Plagiarism" },
    { code: "impersonation", label: "Impersonation or False Identity" },
    { code: "privacy", label: "Privacy Violation" },
    { code: "political", label: "Politically Sensitive Content" },
    { code: "other", label: "Other" },
] as const;

export type ReportType = "review" | "review_reply" | "comment";
const OWNER_SQL: Record<ReportType, string> = {
    review: `SELECT user_id FROM book_reviews WHERE id = $1`,
    review_reply: `SELECT user_id FROM review_replies WHERE id = $1`,
    comment: `SELECT user_id FROM comments WHERE id = $1`,
};

export type ReportResult = { ok: true } | { ok: false; status: number; message: Msg };

export async function createReport(userId: string, type: unknown, targetId: unknown, reason: unknown, detailsValue: unknown): Promise<ReportResult> {
    if (typeof type !== "string" || !(type in OWNER_SQL)) return { ok: false, status: 400, message: "invalidReport" };
    if (typeof targetId !== "string" || !UUID.test(targetId)) return { ok: false, status: 404, message: "notFound" };
    if (typeof reason !== "string" || !REPORT_REASONS.some((r) => r.code === reason)) {
        return { ok: false, status: 400, message: "selectViolation" };
    }
    const details = cleanText(detailsValue, 2000);

    const { rows } = await dbPool.query(OWNER_SQL[type as ReportType], [targetId]);
    if (!rows[0]) return { ok: false, status: 404, message: "notFound" };
    if (rows[0].user_id === userId) return { ok: false, status: 400, message: "cantReportOwnPost" };

    const { rows: today } = await dbPool.query(
        `SELECT count(*)::int AS n FROM content_reports WHERE reporter_id = $1 AND created_at > now() - interval '1 day'`,
        [userId]
    );
    if (Number(today[0]?.n ?? 0) >= 20) return { ok: false, status: 429, message: "tooManyReports" };

    const { rows: saved } = await dbPool.query(
        `INSERT INTO content_reports (reporter_id, target_type, target_id, reason, details)
         VALUES ($1, $2, $3, $4, NULLIF($5, ''))
         ON CONFLICT (reporter_id, target_type, target_id) DO NOTHING
         RETURNING id`,
        [userId, type, targetId, reason, details]
    );
    if (!saved[0]) return { ok: false, status: 409, message: "alreadyReported" };
    return { ok: true };
}