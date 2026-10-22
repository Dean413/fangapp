// app/api/paypal/return/route.ts
// PayPal sends the reader back here after they approve. We take the money (capture), check it,
// credit the coins once, and send them to their wallet.
import { NextRequest, NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { PAYMENT_CONFIG } from "@/lib/payments/config";
import { creditPayment } from "@/lib/payments/credit";

// Where readers land after paying (change to your wallet page)
const WALLET_PATH = "/profile/wallet";

const site = () => PAYMENT_CONFIG.siteUrl.replace(/\/$/, "");
const paypalBase = () => (PAYMENT_CONFIG.paypalLive ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");
const back = (result: string) => NextResponse.redirect(`${site()}${WALLET_PATH}?payment=${result}`);

async function paypalToken(): Promise<string> {
    const basic = Buffer.from(`${PAYMENT_CONFIG.paypalClientId}:${PAYMENT_CONFIG.paypalSecret}`).toString("base64");
    const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
        method: "POST",
        headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: "grant_type=client_credentials",
        cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) throw new Error("PayPal sign-in failed");
    return data.access_token as string;
}

export async function GET(request: NextRequest) {
    const orderId = request.nextUrl.searchParams.get("token");
    if (!orderId || orderId.length > 64) return back("failed");

    try {
        const { rows } = await dbPool.query(
            `SELECT id, price_cents, status FROM payments WHERE provider = 'paypal' AND provider_ref = $1`,
            [orderId]
        );
        const p = rows[0];
        if (!p) return back("failed");
        if (p.status === "paid") return back("success"); // page reloaded

        const token = await paypalToken();
        const res = await fetch(`${paypalBase()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                "PayPal-Request-Id": `fang-capture-${p.id}`, // a second hit gets the same result, never a second charge
            },
            cache: "no-store",
        });
        const data = await res.json();
        const capture = data?.purchase_units?.[0]?.payments?.captures?.[0];

        const paidOk =
            res.ok &&
            data.status === "COMPLETED" &&
            capture?.status === "COMPLETED" &&
            capture?.amount?.currency_code === "USD" &&
            Math.round(Number(capture?.amount?.value) * 100) === p.price_cents;

        if (!paidOk) {
            console.error("PayPal capture not completed for payment", p.id, data?.status, capture?.status);
            return back("failed");
        }

        await creditPayment(p.id, capture.id ?? null);
        return back("success");
    } catch (error) {
        console.error("PayPal return error:", error);
        return back("failed");
    }
}