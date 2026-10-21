// app/api/settings/delete/route.ts
// Delete the account: { password } or, for accounts without one, { code } from /api/settings/delete/code.
// The account is closed, its personal data removed (see deleteAccount in lib/settings.ts), its profile and
// cover photo files deleted from storage, and it's signed out everywhere.
// FangWriters accounts can't be deleted from here.
import { NextRequest } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getCurrentUser } from "@/lib/auth/session";
import { checkCode } from "@/lib/auth/emailCode";
import { lockedMessage } from "@/lib/auth/loginLimit";
import { checkCurrentPassword, deleteAccount } from "@/lib/settings";
import { publicUrl, s3Client, storageReady, UPLOAD_BUCKET } from "@/lib/storage";
import { readJson, reply } from "@/lib/auth/rules";

// Only files this app uploaded (avatars/ and covers/ in its bucket) are deleted; anything else is left alone
async function deletePhotoFiles(urls: string[]) {
    if (!storageReady()) return;
    for (const url of urls) {
        const folder = ["avatars/", "covers/"].find((f) => url.startsWith(publicUrl(f)));
        if (!folder) continue;
        const key = url.slice(publicUrl("").length);
        if (!/^(avatars|covers)\/[A-Za-z0-9-]+\.(png|jpg|webp)$/.test(key)) continue;
        try {
            await s3Client.send(new DeleteObjectCommand({ Bucket: UPLOAD_BUCKET, Key: key }));
        } catch (error) {
            console.error("Photo file delete failed:", key, error);
        }
    }
}

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");

    const body = await readJson(request);
    try {
        const check = await checkCurrentPassword(user.id, body?.password);
        if (typeof check === "object") return reply(429, lockedMessage(check.waitSeconds), { code: "TOO_MANY_ATTEMPTS" });
        if (check === "wrong") return reply(400, "passwordWrong", { field: "password" });
        if (check === "none") {
            const code = typeof body?.code === "string" ? body.code.trim() : "";
            const result = await checkCode(user.id, "delete_account", code);
            if (result !== "ok") {
                return reply(400, result === "expired" ? "codeExpired" : result === "too_many" ? "tooManyTries" : "codeIncorrectShort", { field: "code" });
            }
        }

        const deleted = await deleteAccount(user.id);
        if (!deleted.ok) {
            return reply(409, "writerAccount", { code: "WRITER_ACCOUNT" });
        }
        await deletePhotoFiles(deleted.photos);

        // Sign out on this browser: both login cookies removed on the reply itself
        const response = await reply(200, "accountDeleted");
        for (const name of ["fang_access", "fang_refresh"]) {
            response.cookies.set(name, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
        }
        return response;
    } catch (error) {
        console.error("Delete account error:", error);
        return reply(500, "couldntDeleteAccount");
    }
}