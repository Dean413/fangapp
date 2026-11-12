// app/api/ads/ssv/route.ts
// AdMob server-side verification (SSV) callback. Google calls this after a reader finishes a rewarded ad.
// Set this URL on the rewarded ad unit in AdMob: https://fangapp.io/api/ads/ssv
// The signature is checked with Google's public keys, so nobody can fake a finished ad.
import { NextRequest, NextResponse } from "next/server";
import { createPublicKey, verify, type KeyObject } from "crypto";
import { recordAdView } from "@/lib/adReward";
import { logError } from "@/lib/log";

const KEYS_URL = "https://www.gstatic.com/admob/reward/verifier-keys.json";
const KEYS_TTL = 24 * 60 * 60 * 1000;

let cache: { keys: Map<string, KeyObject>; at: number } | null = null;

async function getKeys(force = false) {
    if (!force && cache && Date.now() - cache.at < KEYS_TTL) return cache.keys;
    const res = await fetch(KEYS_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`AdMob keys: ${res.status}`);
    const body = (await res.json()) as { keys: { keyId: number | string; pem: string }[] };
    const keys = new Map(body.keys.map((k) => [String(k.keyId), createPublicKey(k.pem)]));
    cache = { keys, at: Date.now() };
    return keys;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
    // Google signs the raw query string up to "&signature="
    const query = request.nextUrl.search.replace(/^\?/, "");
    const cut = query.indexOf("&signature=");
    if (cut < 0) return NextResponse.json({ ok: false }, { status: 400 });
    const message = query.slice(0, cut);

    const params = request.nextUrl.searchParams;
    const signature = params.get("signature") ?? "";
    const keyId = params.get("key_id") ?? "";
    if (!signature || !keyId) return NextResponse.json({ ok: false }, { status: 400 });

    try {
        let keys = await getKeys();
        if (!keys.has(keyId)) keys = await getKeys(true); // Google rotated its keys
        const key = keys.get(keyId);
        if (!key) return NextResponse.json({ ok: false }, { status: 400 });

        const valid = verify("sha256", Buffer.from(message), { key, dsaEncoding: "der" }, Buffer.from(signature, "base64url"));
        if (!valid) return NextResponse.json({ ok: false }, { status: 400 });

        // Only our own rewarded units count (comma-separated list in .env; empty = any)
        const adUnit = params.get("ad_unit");
        const allowed = (process.env.ADMOB_REWARDED_UNITS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
        if (allowed.length && (!adUnit || !allowed.some((u) => u.endsWith(adUnit)))) {
            return NextResponse.json({ ok: true, counted: false });
        }

        const userId = params.get("user_id") ?? "";
        const transactionId = params.get("transaction_id") ?? "";
        if (!UUID.test(userId) || !transactionId) return NextResponse.json({ ok: true, counted: false });

        const result = await recordAdView({
            userId,
            transactionId: transactionId.slice(0, 200),
            nonce: (params.get("custom_data") ?? "").slice(0, 100) || null,
            adUnit,
            source: "ssv",
        });
        // Always 200 once the signature is good, so Google doesn't retry
        return NextResponse.json({ ok: true, counted: result === "OK" });
    } catch (error) {
        logError("AdMob SSV error:", error);
        return NextResponse.json({ ok: false }, { status: 500 }); // Google retries later
    }
}