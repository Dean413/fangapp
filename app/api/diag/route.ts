import { dbPool } from "@/lib/db";

export const dynamic = "force-dynamic";
const KEY = "diag-7f3a91c2"; // change this, and delete the whole file after use

export async function GET(req: Request) {
    if (new URL(req.url).searchParams.get("k") !== KEY) return new Response("Not found", { status: 404 });

    const names = [
        "DATABASE_URL", "SITE_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "EMAIL_CODE",
        "RESEND_API_KEY", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "STORY_TENANT",
    ];
    const out: Record<string, unknown> = {
        nodeEnv: process.env.NODE_ENV,
        siteUrl: process.env.SITE_URL ?? null,
        envSet: Object.fromEntries(names.map((n) => [n, Boolean(process.env[n])])),
    };

    try {
        const u = new URL(process.env.DATABASE_URL ?? "");
        out.dbTarget = `${u.hostname}${u.pathname}`; // host and database name only, no password
    } catch {
        out.dbTarget = "DATABASE_URL missing or not a valid URL";
    }

    try {
        const tables = ["users", "reader_profiles", "user_profiles", "email_codes", "user_identities", "wallet_lots", "wallet_ledger", "stories", "payments", "vip_subscriptions"];
        const t = await dbPool.query(`SELECT t AS name FROM unnest($1::text[]) t WHERE to_regclass('public.' || t) IS NULL`, [tables]);
        out.missingTables = t.rows.map((r) => r.name);

        const c = await dbPool.query(
            `SELECT col FROM unnest($1::text[]) col
             WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = col)`,
            [["sessions_valid_after", "account_status", "email_verified_at", "password_hash", "role", "last_active_at"]]
        );
        out.missingUserColumns = c.rows.map((r) => r.col);

        out.users = (await dbPool.query(`SELECT count(*)::int AS n FROM users`)).rows[0].n;
    } catch (e) {
        out.dbError = (e as Error).message;
    }

    return Response.json(out);
}