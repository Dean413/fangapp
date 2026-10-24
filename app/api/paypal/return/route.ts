// app/api/paypal/return/route.ts
// PayPal sends the reader back here after they approve.
//  - Coins: we take the money (capture), check it, credit once.
//  - VIP subscription: we check the subscription is active, credit the first period once.
// Then we send them to their wallet.
import { NextRequest, NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { PAYMENT_CONFIG } from "@/lib/payments/config";
import { creditPayment } from "@/lib/payments/credit";
import { paypalBase, paypalToken } from "@/lib/payments/paypal";
import { creditVipPeriod } from "@/lib/payments/subscription";

// Where readers land after paying (change to your wallet page)
const WALLET_PATH = "/profile/wallet";

const site = () => PAYMENT_CONFIG.siteUrl.replace(/\/$/, "");
const back = (result: string) => NextResponse.redirect(`${site()}${WALLET_PATH}?payment=${result}`);

export async function GET(request: NextRequest) {
    const subscriptionId = request.nextUrl.searchParams.get("subscription_id");
    const orderId = request.nextUrl.searchParams.get("token");

    try {
        // ---------- VIP subscription ----------
        if (subscriptionId) {
            if (!/^I-[A-Za-z0-9]{6,40}$/.test(subscriptionId)) return back("failed");

            const { rows } = await dbPool.query(
                `SELECT id, plan, created_at FROM vip_billing WHERE provider = 'paypal' AND provider_subscription_id = $1`,
                [subscriptionId]
            );
            const billing = rows[0];
            if (!billing) return back("failed");

            const token = await paypalToken();
            const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
            const res = await fetch(`${paypalBase()}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`, { headers, cache: "no-store" });
            const sub = await res.json();
            if (!res.ok) return back("failed");
            if (sub.custom_id !== String(billing.id) || sub.plan_id !== PAYMENT_CONFIG.paypalPlans[billing.plan as "weekly" | "monthly"]) {
                console.error("PayPal subscription does not match", billing.id);
                return back("failed");
            }
            if (sub.status !== "ACTIVE") return back("cancelled"); // not approved

            // The first charge, if PayPal has already made it
            const start = new Date(new Date(billing.created_at).getTime() - 24 * 3600 * 1000).toISOString();
            const end = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
            const txRes = await fetch(
                `${paypalBase()}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/transactions?start_time=${encodeURIComponent(start)}&end_time=${encodeURIComponent(end)}`,
                { headers, cache: "no-store" }
            );
            const txData = await txRes.json().catch(() => null);
            const tx = (txData?.transactions ?? []).find((t: any) => t.status === "COMPLETED");
            if (txRes.ok && tx) {
                await creditVipPeriod({
                    provider: "paypal",
                    subscriptionId,
                    txnId: tx.id,
                    amountCents: Math.round(Number(tx.amount_with_breakdown?.gross_amount?.value) * 100),
                    currency: tx.amount_with_breakdown?.gross_amount?.currency_code ?? "",
                });
            }
            // If the charge isn't visible yet, the webhook credits it as soon as PayPal confirms it
            return back("success");
        }

        // ---------- Coins ----------
        if (!orderId || orderId.length > 64) return back("failed");

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