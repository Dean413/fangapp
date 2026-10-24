// app/api/vip/subscription/route.ts
// GET: does the reader have a VIP subscription that will renew?
// POST: cancel the renewal. VIP stays until the end of the period they already paid for.
import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { stripePost } from "@/lib/payments/stripe";
import { paypalBase, paypalToken } from "@/lib/payments/paypal";
import { setBillingStatus } from "@/lib/payments/subscription";

async function activeBilling(userId: any) {
    const { rows } = await dbPool.query(
        `SELECT id, provider, plan, provider_subscription_id
         FROM vip_billing WHERE user_id = $1 AND status = 'active'
         ORDER BY id DESC LIMIT 1`,
        [userId]
    );
    return rows[0] ?? null;
}

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ recurring: false });
    const billing = await activeBilling(user.id);
    return NextResponse.json({ recurring: !!billing, plan: billing?.plan ?? null });
}

export async function POST() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Please sign in first" }, { status: 401 });

    try {
        const billing = await activeBilling(user.id);
        if (!billing || !billing.provider_subscription_id) {
            return NextResponse.json({ message: "No active subscription" }, { status: 404 });
        }

        if (billing.provider === "stripe") {
            // Stop at the end of the paid period
            const { ok } = await stripePost(
                `/v1/subscriptions/${encodeURIComponent(billing.provider_subscription_id)}`,
                new URLSearchParams({ cancel_at_period_end: "true" })
            );
            if (!ok) throw new Error("Stripe cancel failed");
        } else {
            const token = await paypalToken();
            const res = await fetch(
                `${paypalBase()}/v1/billing/subscriptions/${encodeURIComponent(billing.provider_subscription_id)}/cancel`,
                {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ reason: "Cancelled by the reader" }),
                    cache: "no-store",
                }
            );
            if (!res.ok && res.status !== 422) throw new Error("PayPal cancel failed"); // 422 = already cancelled
        }

        await setBillingStatus(billing.provider, billing.provider_subscription_id, "cancelled");
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Cancel subscription error:", error);
        return NextResponse.json({ message: "Couldn't cancel. Please try again." }, { status: 500 });
    }
}