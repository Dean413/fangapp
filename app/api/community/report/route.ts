// app/api/community/report/route.ts
// POST { type: "post" | "comment", id, reason, details? }   report a community post or comment to the admin.
// Same reasons as the other reports (lib/userActions/reports.ts). One report per reader per thing,
// nobody can report their own, at most 20 community reports a day per reader.
import { getCurrentUser } from "@/lib/auth/session";
import { dbPool } from "@/lib/db";
import { cleanText } from "@/lib/content";
import { validId } from "@/lib/community";
import { REPORT_REASONS } from "@/lib/userActions/reports";
import { readJson, reply } from "@/lib/auth/rules";
import { logError } from "@/lib/log";

const OWNER_SQL = {
    post: `SELECT user_id FROM community_posts WHERE id = $1`,
    comment: `SELECT user_id FROM community_comments WHERE id = $1`,
} as const;

export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");

    const body = await readJson(request);
    const type = body?.type;
    const id = body?.id;
    const reason = body?.reason;
    if (type !== "post" && type !== "comment") return reply(400, "invalidReport");
    if (!validId(id)) return reply(404, "notFound");
    if (typeof reason !== "string" || !REPORT_REASONS.some((r) => r.code === reason)) return reply(400, "selectViolation");
    const details = cleanText(body?.details, 2000);

    try {
        const { rows } = await dbPool.query(OWNER_SQL[type], [id]);
        if (!rows[0]) return reply(404, "notFound");
        if (rows[0].user_id === user.id) return reply(400, "cantReportOwnPost");

        const { rows: today } = await dbPool.query(
            `SELECT count(*)::int AS n FROM community_reports WHERE reporter_id = $1 AND created_at > now() - interval '1 day'`,
            [user.id]
        );
        if (Number(today[0]?.n ?? 0) >= 20) return reply(429, "tooManyReports");

        const { rows: saved } = await dbPool.query(
            `INSERT INTO community_reports (reporter_id, target_type, target_id, reason, details)
             VALUES ($1, $2, $3, $4, NULLIF($5, ''))
             ON CONFLICT (reporter_id, target_type, target_id) DO NOTHING
             RETURNING id`,
            [user.id, type, id, reason, details]
        );
        if (!saved[0]) return reply(409, "alreadyReported");
        return reply(200, "reportThanks");
    } catch (error) {
        logError("Community report error:", error);
        return reply(500, "somethingWrongRetry");
    }
}