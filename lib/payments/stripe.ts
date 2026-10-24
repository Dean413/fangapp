// lib/payments/stripe.ts
// Small helpers for talking to Stripe (no SDK needed).
import "server-only";
import { PAYMENT_CONFIG } from "./config";

const BASE = "https://api.stripe.com";

export async function stripeGet(path: string): Promise<{ ok: boolean; data: any }> {
    const res = await fetch(`${BASE}${path}`, {
        headers: { Authorization: `Bearer ${PAYMENT_CONFIG.stripeSecretKey}` },
        cache: "no-store",
    });
    return { ok: res.ok, data: await res.json().catch(() => null) };
}

export async function stripePost(path: string, form: URLSearchParams, idempotencyKey?: string): Promise<{ ok: boolean; data: any }> {
    const headers: Record<string, string> = {
        Authorization: `Bearer ${PAYMENT_CONFIG.stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
    };
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
    const res = await fetch(`${BASE}${path}`, { method: "POST", headers, body: form, cache: "no-store" });
    return { ok: res.ok, data: await res.json().catch(() => null) };
}