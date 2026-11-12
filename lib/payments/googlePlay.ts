// lib/payments/googlePlay.ts
// Google Play purchases from the mobile app: coin packages (one-time, consumable) and VIP (subscriptions).
// The app sends the purchase token; every purchase is checked with Google (Play Developer API)
// before anything is added, so a fake or reused token gets nothing.
//
// Settings (.env):
//   GOOGLE_PLAY_PACKAGE                  the app's package name, e.g. io.fangapp.app
//   GOOGLE_PLAY_SERVICE_ACCOUNT_FILE     path to the service account JSON key (keep it out of git), or
//   GOOGLE_PLAY_SERVICE_ACCOUNT          the same JSON on one line
//
// App packages have smaller bonuses than the website on purpose. Product ids must match Play Console exactly.
import "server-only";
import { createSign } from "crypto";
import { readFileSync } from "fs";
import { dbPool } from "@/lib/db";
import { withTransaction } from "@/lib/auth/transaction";
import { getVipStatus } from "@/lib/vip";
import { VIP_PLAN_INFO, VIP_TOPUP_PERCENT, type VipPlanId } from "@/lib/vipRates";
import { TOPUP_GEMS } from "./packages";
import { creditPayment } from "./credit";

export const GOOGLE_PLAY_COINS = [
    { productId: "coins_500", coins: 500, bonus: 0, priceCents: 499 },
    { productId: "coins_1000", coins: 1000, bonus: 100, priceCents: 999 },
    { productId: "coins_2000", coins: 2000, bonus: 500, priceCents: 1999 },
    { productId: "coins_3500", coins: 3500, bonus: 1400, priceCents: 3499 },
    { productId: "coins_4000", coins: 4000, bonus: 1750, priceCents: 3999 },
] as const;

export const GOOGLE_PLAY_VIP: Record<string, VipPlanId> = {
    vip_weekly: "weekly",
    vip_monthly: "monthly",
};

export const findGoogleCoins = (productId: unknown) => GOOGLE_PLAY_COINS.find((p) => p.productId === productId) ?? null;

// Extra coins a VIP gets on a top-up (same rule as the website)
export function vipTopUpBonus(coins: number, plan: VipPlanId | null) {
    return plan ? Math.floor((coins * (VIP_TOPUP_PERCENT[plan] ?? 0)) / 100) : 0;
}

// ---------- talking to Google ----------

type ServiceAccount = { client_email: string; private_key: string };

function serviceAccount(): ServiceAccount {
    const file = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_FILE;
    const raw = file ? readFileSync(file, "utf8") : process.env.GOOGLE_PLAY_SERVICE_ACCOUNT;
    if (!raw) throw new Error("Google Play service account is not set");
    const json = JSON.parse(raw);
    return { client_email: json.client_email, private_key: json.private_key };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

// OAuth access token for the Play Developer API (signed with the service account key, cached ~55 minutes)
async function accessToken(): Promise<string> {
    if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;
    const account = serviceAccount();
    const now = Math.floor(Date.now() / 1000);
    const encode = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
        iss: account.client_email,
        scope: "https://www.googleapis.com/auth/androidpublisher",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
    })}`;
    const signature = createSign("RSA-SHA256").update(unsigned).sign(account.private_key).toString("base64url");

    const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
        cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) throw new Error(`Google token: ${data.error_description ?? data.error ?? res.status}`);
    cachedToken = { value: data.access_token, expiresAt: Date.now() + 55 * 60 * 1000 };
    return data.access_token;
}

async function playGet(path: string): Promise<{ status: number; data: any }> {
    const pkg = process.env.GOOGLE_PLAY_PACKAGE;
    if (!pkg) throw new Error("GOOGLE_PLAY_PACKAGE is not set");
    const res = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(pkg)}/purchases/${path}`, {
        headers: { Authorization: `Bearer ${await accessToken()}` },
        cache: "no-store",
    });
    return { status: res.status, data: await res.json().catch(() => null) };
}

// ---------- checking and crediting ----------

export type GoogleResult =
    | { ok: true; kind: "coins" | "vip"; duplicate: boolean }
    | { ok: false; code: "UNKNOWN_PRODUCT" | "INVALID" | "PENDING" | "NOT_YOURS" | "EXPIRED" };

// A coin package. Paid once per Google order, whoever sends the token.
async function verifyCoins(userId: string, productId: string, purchaseToken: string): Promise<GoogleResult> {
    const pkg = findGoogleCoins(productId);
    if (!pkg) return { ok: false, code: "UNKNOWN_PRODUCT" };

    const { status, data } = await playGet(`products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`);
    if (status === 404 || status === 400 || !data) return { ok: false, code: "INVALID" };
    if (status !== 200) throw new Error(`Google product check: ${status} ${data?.error?.message ?? ""}`);
    if (data.purchaseState === 2) return { ok: false, code: "PENDING" }; // e.g. paying cash at a shop
    if (data.purchaseState !== 0) return { ok: false, code: "INVALID" }; // cancelled
    if (data.obfuscatedExternalAccountId && data.obfuscatedExternalAccountId !== userId) return { ok: false, code: "NOT_YOURS" };

    const orderId: string = data.orderId || `token:${purchaseToken.slice(0, 120)}`;
    const vip = await getVipStatus(userId);
    const { rows } = await dbPool.query(
        `INSERT INTO payments (user_id, provider, provider_ref, provider_txn, product, price_cents,
                               base_coins, bonus_coins, vip_bonus_coins, gems, status)
         VALUES ($1, 'google_play', $2, $3, 'coins', $4, $5, $6, $7, $8, 'pending')
         ON CONFLICT (provider, provider_txn) WHERE provider_txn IS NOT NULL DO NOTHING
         RETURNING id`,
        [userId, productId, orderId, pkg.priceCents, pkg.coins, pkg.bonus, vipTopUpBonus(pkg.coins, vip.active ? vip.plan : null), TOPUP_GEMS]
    );
    if (!rows[0]) {
        // Sent before (the app retries until it hears back): finish it if it's still pending
        const { rows: had } = await dbPool.query(
            `SELECT id, user_id, status FROM payments WHERE provider = 'google_play' AND provider_txn = $1`,
            [orderId]
        );
        if (!had[0] || had[0].user_id !== userId) return { ok: false, code: "NOT_YOURS" };
        if (had[0].status === "pending") await creditPayment(Number(had[0].id), orderId);
        return { ok: true, kind: "coins", duplicate: had[0].status !== "pending" };
    }
    await creditPayment(Number(rows[0].id), orderId);
    return { ok: true, kind: "coins", duplicate: false };
}

// A VIP subscription. Each Google order (the first charge and every renewal) adds one period,
// up to the expiry time Google gives.
async function verifyVip(userId: string, productId: string, purchaseToken: string): Promise<GoogleResult> {
    const plan = GOOGLE_PLAY_VIP[productId];
    if (!plan) return { ok: false, code: "UNKNOWN_PRODUCT" };

    const { status, data } = await playGet(`subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`);
    if (status === 404 || status === 400 || !data) return { ok: false, code: "INVALID" };
    if (status !== 200) throw new Error(`Google subscription check: ${status} ${data?.error?.message ?? ""}`);

    const owner = data.externalAccountIdentifiers?.obfuscatedExternalAccountId;
    if (owner && owner !== userId) return { ok: false, code: "NOT_YOURS" };
    if (data.subscriptionState === "SUBSCRIPTION_STATE_PENDING") return { ok: false, code: "PENDING" };

    const item = (data.lineItems ?? []).find((l: any) => l.productId === productId);
    const expiry = item?.expiryTime ? new Date(item.expiryTime) : null;
    const orderId: string | undefined = data.latestOrderId;
    if (!item || !expiry || !orderId) return { ok: false, code: "INVALID" };
    if (expiry.getTime() <= Date.now()) return { ok: false, code: "EXPIRED" };

    const credited = await withTransaction(async (client) => {
        await client.query(`SELECT 1 FROM users WHERE id = $1 FOR UPDATE`, [userId]);
        const { rows: made } = await client.query(
            `INSERT INTO payments (user_id, provider, provider_ref, provider_txn, product, price_cents,
                                   base_coins, bonus_coins, vip_bonus_coins, vip_plan, gems, status, paid_at)
             VALUES ($1, 'google_play', $2, $3, 'vip', $4, 0, 0, 0, $5, 0, 'paid', now())
             ON CONFLICT (provider, provider_txn) WHERE provider_txn IS NOT NULL DO NOTHING
             RETURNING id`,
            [userId, productId, orderId, VIP_PLAN_INFO[plan].priceCents, plan]
        );
        if (!made[0]) return false; // this order was added before

        // From the end of any VIP they still have, until Google's expiry time
        await client.query(
            `INSERT INTO vip_subscriptions (user_id, plan, starts_at, ends_at, source, external_id)
             SELECT $1, $2, s.start, $3::timestamptz, 'google_play', $4
             FROM (SELECT GREATEST(now(), COALESCE(MAX(ends_at), now())) AS start
                   FROM vip_subscriptions WHERE user_id = $1 AND ends_at > now()) s
             WHERE $3::timestamptz > s.start`,
            [userId, plan, expiry.toISOString(), `payment:${made[0].id}`]
        );
        return true;
    });
    return { ok: true, kind: "vip", duplicate: !credited };
}

export async function verifyGooglePurchase(userId: string, productId: string, purchaseToken: string): Promise<GoogleResult> {
    if (GOOGLE_PLAY_VIP[productId]) return verifyVip(userId, productId, purchaseToken);
    return verifyCoins(userId, productId, purchaseToken);
}