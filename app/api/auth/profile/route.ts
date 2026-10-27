// app/api/auth/profile/route.ts
// Saves the signed-in reader's profile (sign-up step 3, and the Edit Profile card).
// If the account has no reader profile yet (e.g. sign-up step 3 was skipped), it's made here.
// Send only the fields to change:
//   fullName  2–60 characters
//   username  3–20 letters, numbers or _, unique (capital letters don't count)
//   bio       "About you", up to 300 characters ("" clears it)
//   genreIds  favourite genre IDs from /api/genres, up to 10 (replaces the old list)
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { withTransaction } from "@/lib/auth/transaction";
import { BIO_MAX, MAX_GENRES, USERNAME_RULE, getReaderProfile } from "@/lib/readerProfile";
import { cleanName, newPublicId } from "@/lib/auth/account";
import { readJson, reply } from "@/lib/auth/rules";
import { msg } from "@/lib/i18n";
import { logError } from "@/lib/log";

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");

    const body = await readJson(request);
    if (!body) return reply(400, "invalidRequest");

    // Check everything before saving anything
    let fullName: string | undefined;
    if (body.fullName !== undefined) {
        fullName = cleanName(body.fullName);
        if (fullName.length < 2) return reply(400, "enterFullName", { field: "fullName" });
    }

    let username: string | undefined;
    if (body.username !== undefined) {
        if (typeof body.username !== "string" || !USERNAME_RULE.test(body.username.trim())) {
            return reply(400, "usernameRule", { field: "username" });
        }
        username = body.username.trim();
    }

    let bio: string | null | undefined;
    if (body.bio !== undefined) {
        if (typeof body.bio !== "string") return reply(400, "invalidBio", { field: "bio" });
        const text = body.bio.replace(/\r\n/g, "\n").trim();
        if (text.length > BIO_MAX) return reply(400, msg("bioMax", { max: BIO_MAX }), { field: "bio" });
        bio = text || null;
    }

    let genreIds: string[] | undefined;
    if (body.genreIds !== undefined) {
        if (!Array.isArray(body.genreIds) || body.genreIds.some((g) => typeof g !== "string" && typeof g !== "number")) {
            return reply(400, "invalidGenres", { field: "genres" });
        }
        genreIds = [...new Set(body.genreIds.map((g) => String(g)))];
        if (genreIds.length > MAX_GENRES) return reply(400, msg("chooseUpToGenres", { max: MAX_GENRES }), { field: "genres" });
    }

    try {
        const result = await withTransaction(async (client) => {
            // Make the reader profile first if it's missing
            await client.query(
                `INSERT INTO reader_profiles (user_id, public_id, full_name) VALUES ($1, $2, $3)
                 ON CONFLICT (user_id) DO NOTHING`,
                [user.id, await newPublicId(client), fullName ?? ""]
            );
            await client.query(`SELECT 1 FROM reader_profiles WHERE user_id = $1 FOR UPDATE`, [user.id]);

            // Checks first, so either everything is saved or nothing is
            if (username !== undefined) {
                const { rows: taken } = await client.query(
                    `SELECT 1 FROM reader_profiles WHERE lower(username) = lower($1) AND user_id <> $2`,
                    [username, user.id]
                );
                if (taken[0]) return "USERNAME_TAKEN" as const;
            }

            let validGenres: { id: unknown }[] = [];
            if (genreIds !== undefined) {
                // Only real, enabled Primary Genre options count
                const { rows } = await client.query(
                    `SELECT o.id FROM metadata_options o JOIN metadata_categories c ON c.id = o.category_id
                     WHERE c.slug = 'primary_genre' AND o.enabled AND o.id::text = ANY($1::text[])`,
                    [genreIds]
                );
                if (rows.length !== genreIds.length) return "BAD_GENRES" as const;
                validGenres = rows;
            }

            await client.query(
                `UPDATE reader_profiles SET
                    full_name  = CASE WHEN $2::boolean THEN $3 ELSE full_name END,
                    username   = CASE WHEN $4::boolean THEN $5 ELSE username END,
                    bio        = CASE WHEN $6::boolean THEN $7 ELSE bio END,
                    updated_at = now()
                 WHERE user_id = $1`,
                [user.id, fullName !== undefined, fullName ?? null, username !== undefined, username ?? null, bio !== undefined, bio ?? null]
            );

            if (genreIds !== undefined) {
                await client.query(`DELETE FROM reader_favorite_genres WHERE user_id = $1`, [user.id]);
                for (const row of validGenres) {
                    await client.query(`INSERT INTO reader_favorite_genres (user_id, option_id) VALUES ($1, $2)`, [user.id, row.id]);
                }
            }
            return "OK" as const;
        });

        if (result === "USERNAME_TAKEN") return reply(409, "usernameTaken", { field: "username" });
        if (result === "BAD_GENRES") return reply(400, "genreUnavailable", { field: "genres" });

        return reply(200, "profileSaved", { profile: await getReaderProfile(user.id) });
    } catch (error) {
        // Two readers taking the same username at the same moment: the database lets only one through
        if (error instanceof Error && "code" in error && (error as { code?: string }).code === "23505") {
            return reply(409, "usernameTaken", { field: "username" });
        }
        logError("Profile save error:", error);
        return reply(500, "couldntSaveProfile");
    }
}