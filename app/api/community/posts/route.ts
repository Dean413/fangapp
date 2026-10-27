import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getCurrentUser } from "@/lib/auth/session";
import { publicUrl, s3Client, storageReady, UPLOAD_BUCKET } from "@/lib/storage";
import { readJson, reply } from "@/lib/auth/rules";
import { msg } from "@/lib/i18n";
import { logError } from "@/lib/log";
import { POST_MAX, createPost, getPost, listPosts, validId } from "@/lib/community";

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp" };

function detectType(bytes: Buffer): string | null {
    const starts = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);
    if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
    if (starts([0xff, 0xd8, 0xff])) return "image/jpeg";
    if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
    return null;
}

// GET /api/community/posts?cursor=&author=&following=1
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        const sp = request.nextUrl.searchParams;
        const cursor = sp.get("cursor");
        const author = sp.get("author");
        const following = sp.get("following") === "1" && !!user;
        const data = await listPosts(user?.id ?? null, {
            cursor: validId(cursor) ? cursor : null,
            author: author && /^[0-9a-f-]{36}$/i.test(author) ? author : null,
            following,
        });
        return NextResponse.json(data);
    } catch (error) {
        logError("Community feed failed:", error);
        return reply(500, "somethingWrongRetry");
    }
}

// POST /api/community/posts  { body, image? (data URL) }
export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");

    const input = await readJson(request);
    const body = typeof input?.body === "string" ? input.body.trim() : "";
    const image = typeof input?.image === "string" ? input.image : "";
    if (body.length > POST_MAX) return reply(400, msg("postTooLong", { max: POST_MAX }));
    if (!body && !image) return reply(400, "postEmpty");

    let imageUrl: string | null = null;
    if (image) {
        if (!storageReady()) {
            logError("Community image upload is not set up: AWS settings missing (lib/storage.ts)");
            return reply(503, "photoUnavailable");
        }
        const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(image);
        if (!match || match[2].length > Math.ceil(MAX_BYTES / 3) * 4 + 4) {
            return reply(400, msg("photoTypeSize", { mb: 2 }));
        }
        const bytes = Buffer.from(match[2], "base64");
        const realType = detectType(bytes);
        if (!realType || bytes.length === 0 || bytes.length > MAX_BYTES) {
            return reply(400, msg("photoTypeSize", { mb: 2 }));
        }
        const key = `community/${crypto.randomUUID()}${TYPES[realType]}`;
        try {
            await s3Client.send(new PutObjectCommand({ Bucket: UPLOAD_BUCKET, Key: key, Body: bytes, ContentType: realType }));
            imageUrl = publicUrl(key);
        } catch (error) {
            logError("Community image upload failed:", error);
            return reply(500, "couldntSavePhoto");
        }
    }

    try {
        const result = await createPost(user.id, body, imageUrl);
        if (result.error) return reply(429, result.error);
        const post = await getPost(user.id, result.id);
        return NextResponse.json({ post });
    } catch (error) {
        logError("Creating a community post failed:", error);
        return reply(500, "somethingWrongRetry");
    }
}