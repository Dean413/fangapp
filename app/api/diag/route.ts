import { dbPool } from "@/lib/db";
import { generateAccessToken, verifyAccessToken } from "@/lib/auth/token";
import { createReaderProfile } from "@/lib/auth/account";
import { sendCodeEmail } from "@/lib/auth/email";

export const dynamic = "force-dynamic";
const KEY = "diag-7f3a91c2"; // delete this whole file after use

const run = async (fn: () => Promise<unknown>) => {
    try {
        return { ok: true, result: (await fn()) ?? null };
    } catch (e) {
        return { ok: false, error: (e as Error).message };
    }
};

export async function GET(req: Request) {
    const url = new URL(req.url);
    if (url.searchParams.get("k") !== KEY) return new Response("Not found", { status: 404 });

    const out: Record<string, unknown> = {};

    // 1. Can login tokens be signed and read back (JWT secrets)?
    out.jwt = await run(async () => {
        const token = await generateAccessToken({ id: "00000000-0000-0000-0000-000000000000", email: "t@t.com", role: "reader" });
        await verifyAccessToken(token);
        return "signed and verified";
    });

    // 2. Does the sign-up database work? Everything is rolled back.
    out.signupDryRun = await run(async () => {
        const client = await dbPool.connect();
        try {
            await client.query("BEGIN");
            const u = await client.query(
                `INSERT INTO users (email, password_hash, role, email_verified_at)
                 VALUES ('diag-test@example.invalid', 'x', 'reader', NULL) RETURNING id`
            );
            await createReaderProfile(client, u.rows[0].id, "Diag Test");
            await client.query(
                `INSERT INTO email_codes (user_id, purpose, code_hash, attempts, expires_at, sent_at, send_times)
                 VALUES ($1, 'verify_email', 'x', 0, now() + interval '15 minutes', now(), ARRAY[now()])`,
                [u.rows[0].id]
            );
            return "user, reader profile and email code all inserted";
        } finally {
            await client.query("ROLLBACK");
            client.release();
        }
    });

    // 3. Does Resend send? Add &to=you@example.com to send a test email to yourself.
    const to = url.searchParams.get("to");
    if (to) {
        out.email = await run(async () => {
            await sendCodeEmail("verify_email", to, "123456");
            return `sent to ${to}`;
        });
    }

    return Response.json(out);
}