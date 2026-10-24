// app/api/webhooks/paypal/route.ts
// PayPal tells us a VIP subscription was charged (first time or renewal) or cancelled.
// We ask PayPal to confirm the message is real, then check the amount, then credit once.
import { NextRequest, NextResponse } from "next/server";
import { PAYMENT_CONFIG } from "@/lib/payments/config";
import { paypalBase, paypalToken } from "@/lib/payments/paypal";
import { creditVipPeriod, setBillingStatus } from "@/lib/payments/subscription";

const ok = () => NextResponse.json({ received: true });

async function isGenuine(event: unknown, headers: Headers): Promise<boolean> {
    if (!PAYMENT_CONFIG.paypalWebhookId) return false;
    const token = await paypalToken();
    const res = await fetch(`${paypalBase()}/v1/notifications/verify-webhook-signature`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            auth_algo: headers.get("paypal-auth-algo"),
            cert_url: headers.get("paypal-cert-url"),
            transmission_id: headers.get("paypal-transmission-id"),
            transmission_sig: headers.get("paypal-transmission-sig"),
            transmission_time: headers.get("paypal-transmission-time"),
            webhook_id: PAYMENT_CONFIG.paypalWebhookId,
            webhook_event: event,
        }),
        cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    return res.ok && data?.verification_status === "SUCCESS";
}

export async function POST(request: NextRequest) {
    let event: any;
    try {
        event = JSON.parse(await request.text());
    } catch {
        return NextResponse.json({ message: "Bad request" }, { status: 400 });
    }

    try {
        if (!(await isGenuine(event, request.headers))) {
            return NextResponse.json({ message: "Bad signature" }, { status: 400 });
        }

        const type: string = event?.event_type;
        const resource = event?.resource;
        if (!resource) return ok();

        // ---- A VIP charge went through (first payment and every renewal) ----
        if (type === "PAYMENT.SALE.COMPLETED") {
            if (resource.state && String(resource.state).toLowerCase() !== "completed") return ok();
            await creditVipPeriod({
                provider: "paypal",
                subscriptionId: resource.billing_agreement_id,
                txnId: resource.id,
                amountCents: Math.round(Number(resource.amount?.total) * 100),
                currency: resource.amount?.currency ?? "",
            });
            return ok();
        }

        // ---- Reader cancelled: no more charges, VIP runs to the end of the paid period ----
        if (type === "BILLING.SUBSCRIPTION.CANCELLED") {
            await setBillingStatus("paypal", resource.id, "cancelled");
            return ok();
        }
        // ---- Stopped by PayPal (failed payments) or ran out ----
        if (type === "BILLING.SUBSCRIPTION.SUSPENDED" || type === "BILLING.SUBSCRIPTION.EXPIRED") {
            await setBillingStatus("paypal", resource.id, "ended");
            return ok();
        }
        if (type === "BILLING.SUBSCRIPTION.PAYMENT.FAILED") {
            console.warn("PayPal renewal payment failed", resource.id);
            return ok();
        }

        return ok();
    } catch (error) {
        console.error("PayPal webhook error:", error);
        return NextResponse.json({ message: "Try again" }, { status: 500 }); // PayPal will retry
    }
}