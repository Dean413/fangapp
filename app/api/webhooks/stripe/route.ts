// app/api/webhooks/stripe/route.ts
// Stripe tells us what happened: a coin payment went through, a VIP subscription charged (first time or renewal),
// or a subscription was cancelled. We check the signature, then the amount, then credit once.
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { dbPool } from "@/lib/db";
import { PAYMENT_CONFIG } from "@/lib/payments/config";
import { creditPayment } from "@/lib/payments/credit";
import {
    creditVipPeriod,
    linkStripeSubscription,
    linkStripeSubscriptionById,
    setBillingStatus,
} from "@/lib/payments/subscription";

function validSignature(raw: string, header: string | null, secret: string): boolean {
    if (!header || !secret) return false;
    const parts = header.split(",").map((s) => s.trim().split("="));
    const t = parts.find(([k]) => k === "t")?.[1];
    const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
    if (!t || signatures.length === 0) return false;
    if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false; // older than 5 minutes
    const expected = crypto.createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
    return signatures.some((sig) => sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)));
}

const ok = () => NextResponse.json({ received: true });

export async function POST(request: NextRequest) {
    const raw = await request.text();
    if (!validSignature(raw, request.headers.get("stripe-signature"), PAYMENT_CONFIG.stripeWebhookSecret)) {
        return NextResponse.json({ message: "Bad signature" }, { status: 400 });
    }

    let event: any;
    try {
        event = JSON.parse(raw);
    } catch {
        return NextResponse.json({ message: "Bad request" }, { status: 400 });
    }

    const type: string = event?.type;
    const obj = event.data?.object;
    if (!obj) return ok();

    try {
        // ---- Checkout finished ----
        if (type === "checkout.session.completed" || type === "checkout.session.async_payment_succeeded") {
            // A VIP subscription: just remember which subscription it is. The money arrives as an invoice below.
            if (obj.mode === "subscription") {
                await linkStripeSubscription(obj.id, obj.subscription);
                return ok();
            }

            // A coin payment
            if (!obj.id || obj.payment_status !== "paid") return ok();
            const { rows } = await dbPool.query(
                `SELECT id, price_cents, status FROM payments WHERE provider = 'stripe' AND provider_ref = $1`,
                [obj.id]
            );
            const p = rows[0];
            if (!p) return ok();

            // What was actually paid must match what we asked for
            if (obj.amount_total !== p.price_cents || String(obj.currency).toLowerCase() !== "usd") {
                console.error("Stripe amount mismatch for payment", p.id);
                return ok();
            }
            await creditPayment(p.id, typeof obj.payment_intent === "string" ? obj.payment_intent : null);
            return ok();
        }

        // ---- A VIP charge went through (first payment and every renewal) ----
        if (type === "invoice.paid") {
            const subscriptionId: string | null =
                typeof obj.subscription === "string"
                    ? obj.subscription
                    : obj.parent?.subscription_details?.subscription ?? null;
            if (!subscriptionId || obj.status !== "paid") return ok();

            await linkStripeSubscriptionById(subscriptionId);
            await creditVipPeriod({
                provider: "stripe",
                subscriptionId,
                txnId: obj.id,
                amountCents: obj.amount_paid,
                currency: obj.currency,
            });
            return ok();
        }

        // ---- A renewal failed: nothing is added, VIP simply runs out. Stripe retries by itself. ----
        if (type === "invoice.payment_failed") {
            console.warn("Stripe renewal payment failed", obj.id);
            return ok();
        }

        // ---- Reader (or we) cancelled ----
        if (type === "customer.subscription.updated" && obj.cancel_at_period_end === true) {
            await setBillingStatus("stripe", obj.id, "cancelled");
            return ok();
        }
        if (type === "customer.subscription.deleted") {
            await setBillingStatus("stripe", obj.id, "ended");
            return ok();
        }

        return ok();
    } catch (error) {
        console.error("Stripe webhook error:", error);
        return NextResponse.json({ message: "Try again" }, { status: 500 }); // Stripe will retry
    }
}