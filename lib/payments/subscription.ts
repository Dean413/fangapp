// lib/payments/subscriptions.ts
// Recurring VIP: every successful charge (first one and each renewal) adds one more VIP period.
// Safe to call many times for the same charge (webhook retries, return page + webhook): only the first does anything.
import "server-only";
import { dbPool } from "@/lib/db";
import { withTransaction } from "@/lib/auth/transaction";
import { VIP_PLAN_INFO, isVipPlan } from "@/lib/vipRates";
import { stripeGet } from "./stripe";

type Provider = "stripe" | "paypal";

export async function creditVipPeriod(args: {
    provider: Provider;
    subscriptionId: string | null | undefined;
    txnId: string | null | undefined;
    amountCents: number;
    currency: string;
}): Promise<"credited" | "duplicate" | "ignored"> {
    const { provider, subscriptionId, txnId, amountCents, currency } = args;
    if (!subscriptionId || !txnId) return "ignored";

    return withTransaction(async (client): Promise<"credited" | "duplicate" | "ignored"> => {
        const { rows: found } = await client.query(
            `SELECT id, user_id, plan FROM vip_billing WHERE provider = $1 AND provider_subscription_id = $2`,
            [provider, subscriptionId]
        );
        const billing = found[0];
        const plan: unknown = billing?.plan;
        if (!billing || !isVipPlan(plan)) {
            console.error("VIP charge for an unknown subscription", provider, subscriptionId);
            return "ignored";
        }
        const info = VIP_PLAN_INFO[plan];
        // What was charged must be exactly the plan price
        if (amountCents !== info.priceCents || String(currency).toLowerCase() !== "usd") {
            console.error("VIP charge amount mismatch", provider, subscriptionId, amountCents, currency);
            return "ignored";
        }

        // One at a time per reader
        await client.query(`SELECT 1 FROM users WHERE id = $1 FOR UPDATE`, [billing.user_id]);

        // The same charge can reach us twice under different ids (return page + webhook).
        // Real renewals are a full period apart, so anything within half a period is a repeat.
        const { rows: recent } = await client.query(
            `SELECT 1 FROM payments
             WHERE provider = $1 AND provider_ref = $2 AND product = 'vip' AND status = 'paid'
               AND paid_at > now() - make_interval(secs => $3::double precision)
             LIMIT 1`,
            [provider, subscriptionId, info.days * 43200]
        );
        if (recent.length > 0) return "duplicate";

        const { rows: made } = await client.query(
            `INSERT INTO payments (user_id, provider, provider_ref, provider_txn, product, price_cents,
                                   base_coins, bonus_coins, vip_bonus_coins, vip_plan, gems, status, paid_at)
             VALUES ($1, $2, $3, $4, 'vip', $5, 0, 0, 0, $6, 0, 'paid', now())
             ON CONFLICT (provider, provider_txn) WHERE provider_txn IS NOT NULL DO NOTHING
             RETURNING id`,
            [billing.user_id, provider, subscriptionId, txnId, info.priceCents, billing.plan]
        );
        if (!made[0]) return "duplicate";

        // Add the period after whatever VIP they still have
        await client.query(
            `INSERT INTO vip_subscriptions (user_id, plan, starts_at, ends_at, source, external_id)
             SELECT $1, $2, s.start, s.start + make_interval(days => $3::int), $4, $5
             FROM (SELECT GREATEST(now(), COALESCE(MAX(ends_at), now())) AS start
                   FROM vip_subscriptions WHERE user_id = $1 AND ends_at > now()) s`,
            [billing.user_id, billing.plan, info.days, provider, `payment:${made[0].id}`]
        );

        await client.query(
            `UPDATE vip_billing SET status = 'active', activated_at = COALESCE(activated_at, now())
             WHERE id = $1 AND status IN ('pending', 'active')`,
            [billing.id]
        );
        return "credited";
    });
}

// Stripe: remember the subscription id that belongs to a checkout session
export async function linkStripeSubscription(sessionId: string, subscriptionId: unknown): Promise<void> {
    if (typeof subscriptionId !== "string" || !subscriptionId) return;
    await dbPool.query(
        `UPDATE vip_billing SET provider_subscription_id = $2
         WHERE provider = 'stripe' AND provider_ref = $1 AND provider_subscription_id IS NULL`,
        [sessionId, subscriptionId]
    );
}

// Stripe: the first invoice can arrive before we know the subscription, so ask Stripe whose it is
export async function linkStripeSubscriptionById(subscriptionId: string): Promise<void> {
    const { rows } = await dbPool.query(
        `SELECT 1 FROM vip_billing WHERE provider = 'stripe' AND provider_subscription_id = $1`,
        [subscriptionId]
    );
    if (rows[0]) return;
    const { ok, data } = await stripeGet(`/v1/subscriptions/${encodeURIComponent(subscriptionId)}`);
    const billingId = Number(data?.metadata?.billing_id);
    if (!ok || !Number.isInteger(billingId)) return;
    await dbPool.query(
        `UPDATE vip_billing SET provider_subscription_id = $1
         WHERE id = $2 AND provider = 'stripe' AND provider_subscription_id IS NULL`,
        [subscriptionId, billingId]
    );
}

// 'cancelled' = no more charges, VIP runs to the end of the paid period. 'ended' = finished.
export async function setBillingStatus(provider: Provider, subscriptionId: string, status: "cancelled" | "ended"): Promise<void> {
    await dbPool.query(
        `UPDATE vip_billing SET status = $3, cancelled_at = COALESCE(cancelled_at, now())
         WHERE provider = $1 AND provider_subscription_id = $2 AND status <> 'ended'`,
        [provider, subscriptionId, status]
    );
}