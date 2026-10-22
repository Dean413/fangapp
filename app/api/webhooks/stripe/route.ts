// app/api/webhooks/stripe/route.ts
// Stripe tells us a payment went through. We check the signature, then the amount, then credit once.
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { dbPool } from "@/lib/db";
import { PAYMENT_CONFIG } from "@/lib/payments/config";
import { creditPayment } from "@/lib/payments/credit";

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

    const type = event?.type;
    if (type !== "checkout.session.completed" && type !== "checkout.session.async_payment_succeeded") {
        return NextResponse.json({ received: true });
    }

    const session = event.data?.object;
    if (!session?.id || session.payment_status !== "paid") return NextResponse.json({ received: true });

    try {
        const { rows } = await dbPool.query(
            `SELECT id, price_cents, status FROM payments WHERE provider = 'stripe' AND provider_ref = $1`,
            [session.id]
        );
        const p = rows[0];
        if (!p) return NextResponse.json({ received: true });

        // What was actually paid must match what we asked for
        if (session.amount_total !== p.price_cents || String(session.currency).toLowerCase() !== "usd") {
            console.error("Stripe amount mismatch for payment", p.id);
            return NextResponse.json({ received: true });
        }

        await creditPayment(p.id, typeof session.payment_intent === "string" ? session.payment_intent : null);
        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("Stripe webhook error:", error);
        return NextResponse.json({ message: "Try again" }, { status: 500 }); // Stripe will retry
    }
}