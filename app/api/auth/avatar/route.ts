import { NextRequest } from "next/server";
import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { dbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { publicUrl, s3Client, storageReady, UPLOAD_BUCKET } from "@/lib/storage";
import { readJson, reply } from "@/lib/auth/rules";
import { msg } from "@/lib/i18n";
import { logError } from "@/lib/log";

const MAX_BYTES = 2 * 1024 * 1024;

const TYPES: Record<string, string> = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp" };

function detectType(bytes: Buffer): string | null {
    const starts = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);
    if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
    if (starts([0xff, 0xd8, 0xff])) return "image/jpeg";
    if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
    return null;
}

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");

    if (!storageReady()) {
        logError("Photo upload is not set up: AWS settings missing (lib/storage.ts)");
        return reply(503, "photoUnavailable");
    }

    const body = await readJson(request);
    const image = typeof body?.image === "string" ? body.image : "";
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(image);
    if (!match || match[2].length > Math.ceil(MAX_BYTES / 3) * 4 + 4) {
        return reply(400, msg("photoTypeSize", { mb: 2 }));
    }

    const bytes = Buffer.from(match[2], "base64");
    const realType = detectType(bytes);
    if (!realType || bytes.length === 0 || bytes.length > MAX_BYTES) {
        return reply(400, msg("photoTypeSize", { mb: 2 }));
    }

    const key = `avatars/${crypto.randomUUID()}${TYPES[realType]}`;
    try {
        await s3Client.send(
            new PutObjectCommand({ Bucket: UPLOAD_BUCKET, Key: key, Body: bytes, ContentType: realType })
        );
        const url = publicUrl(key);
        await dbPool.query(
            `UPDATE reader_profiles SET avatar_url = $2, updated_at = now() WHERE user_id = $1`,
            [user.id, url]
        );
        return reply(200, "photoSaved", { avatar_url: url });
    } catch (error) {
        logError("Avatar upload failed:", error);
        return reply(500, "couldntSavePhoto");
    }
}