// app/api/stripe/return/route.ts
// Stripe sends the reader back here after paying. We ask Stripe directly whether the session
// is paid (needs only the secret key), check amount and payment, credit once, then go to the wallet.
import { NextRequest, NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { PAYMENT_CONFIG } from "@/lib/payments/config";
import { creditPayment } from "@/lib/payments/credit";

// Where readers land after paying (change to your wallet page)
const WALLET_PATH = "/profile/wallet";

const site = () => PAYMENT_CONFIG.siteUrl.replace(/\/$/, "");
const back = (result: string) => NextResponse.redirect(`${site()}${WALLET_PATH}?payment=${result}`);

export async function GET(request: NextRequest) {
    const sessionId = request.nextUrl.searchParams.get("session_id") ?? "";
    if (!/^cs_[A-Za-z0-9_]{10,200}$/.test(sessionId)) return back("failed");

    try {
        const { rows } = await dbPool.query(
            `SELECT id, price_cents, status FROM payments WHERE provider = 'stripe' AND provider_ref = $1`,
            [sessionId]
        );
        const p = rows[0];
        if (!p) return back("failed");
        if (p.status === "paid") return back("success"); // already credited (webhook or page reload)

        // Ask Stripe, never trust the address bar
        const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
            headers: { Authorization: `Bearer ${PAYMENT_CONFIG.stripeSecretKey}` },
            cache: "no-store",
        });
        const session = await res.json();
        if (!res.ok) return back("failed");

        if (session.payment_status !== "paid") return back("cancelled");

        const matches =
            session.client_reference_id === String(p.id) &&
            session.amount_total === p.price_cents &&
            String(session.currency).toLowerCase() === "usd";
        if (!matches) {
            console.error("Stripe session does not match payment", p.id);
            return back("failed");
        }

        await creditPayment(p.id, typeof session.payment_intent === "string" ? session.payment_intent : null);
        return back("success");
    } catch (error) {
        console.error("Stripe return error:", error);
        return back("failed");
    }
}