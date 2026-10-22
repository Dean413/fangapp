// app/api/checkout/route.ts
// Starts a Stripe or PayPal payment for a coin package or a VIP plan. The browser only says
// which one and which provider; price, coins and the VIP bonus are decided here.
import { NextRequest, NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getVipStatus } from "@/lib/vip";
import { PAYMENT_CONFIG } from "@/lib/payments/config";
import { findPackage, TOPUP_GEMS } from "@/lib/payments/packages";
import { VIP_PLAN_INFO, VIP_TOPUP_PERCENT, isVipPlan } from "@/lib/vipRates";

// Where readers land after paying (change to your wallet page)
const WALLET_PATH = "/profile/wallet";

const site = () => PAYMENT_CONFIG.siteUrl.replace(/\/$/, "");
const fail = (status: number, message: string) => NextResponse.json({ message }, { status });
const paypalBase = () => (PAYMENT_CONFIG.paypalLive ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");

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

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return fail(401, "Please sign in first");

    let body: any = null;
    try {
        body = await request.json();
    } catch {
        return fail(400, "Invalid request");
    }
    const provider = body?.provider;
    if (provider !== "stripe" && provider !== "paypal") return fail(400, "Invalid request");

    // What is being bought: a VIP plan or a coin package
    const buyingVip = body?.plan !== undefined;
    const plan = buyingVip ? body.plan : null;
    const pkg = buyingVip ? null : findPackage(body?.coins);
    if (buyingVip ? !isVipPlan(plan) : !pkg) return fail(400, "Invalid request");

    try {
        // No piling up of unfinished payments
        const { rows: recent } = await dbPool.query(
            `SELECT count(*)::int AS n FROM payments WHERE user_id = $1 AND created_at > now() - interval '10 minutes'`,
            [user.id]
        );
        if (recent[0].n >= 10) return fail(429, "Too many attempts. Please wait a few minutes.");

        let priceCents: number;
        let productName: string;
        let paymentId: number;

        const current = await getVipStatus(user.id);
        if (current.active) return fail(409, "You already have an active VIP plan");

        if (buyingVip) {
            const info = VIP_PLAN_INFO[plan as keyof typeof VIP_PLAN_INFO];
            priceCents = info.priceCents;
            productName = plan === "weekly" ? "FANG Weekly VIP" : "FANG Monthly VIP";
            const { rows } = await dbPool.query(
                `INSERT INTO payments (user_id, provider, product, price_cents, base_coins, bonus_coins, vip_bonus_coins, vip_plan, gems)
                 VALUES ($1, $2, 'vip', $3, 0, 0, 0, $4, 0)
                 RETURNING id`,
                [user.id, provider, priceCents, plan]
            );
            paymentId = rows[0].id;
        } else {
            // What this reader gets, fixed now and shown to them in the popup
            const vip = await getVipStatus(user.id);
            const vipPercent = vip.active && vip.plan ? VIP_TOPUP_PERCENT[vip.plan] ?? 0 : 0;
            const vipBonus = Math.floor((pkg!.coins * vipPercent) / 100);
            priceCents = pkg!.priceCents;
            productName = `${(pkg!.coins + pkg!.bonus + vipBonus).toLocaleString("en-US")} FANG Coins`;
            const { rows } = await dbPool.query(
                `INSERT INTO payments (user_id, provider, product, price_cents, base_coins, bonus_coins, vip_bonus_coins, vip_plan, gems)
                 VALUES ($1, $2, 'coins', $3, $4, $5, $6, $7, $8)
                 RETURNING id`,
                [user.id, provider, priceCents, pkg!.coins, pkg!.bonus, vipBonus, vipPercent > 0 ? vip.plan : null, TOPUP_GEMS]
            );
            paymentId = rows[0].id;
        }

        let ref: string;
        let url: string;

        if (provider === "stripe") {
            const form = new URLSearchParams({
                mode: "payment",
                client_reference_id: String(paymentId),
                success_url: `${site()}/api/stripe/return?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${site()}${WALLET_PATH}?payment=cancelled`,
                "line_items[0][quantity]": "1",
                "line_items[0][price_data][currency]": "usd",
                "line_items[0][price_data][unit_amount]": String(priceCents),
                "line_items[0][price_data][product_data][name]": productName,
                "metadata[payment_id]": String(paymentId),
            });
            if (user.email) form.set("customer_email", user.email);
            const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${PAYMENT_CONFIG.stripeSecretKey}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Idempotency-Key": `fang-checkout-${paymentId}`,
                },
                body: form,
                cache: "no-store",
            });
            const data = await res.json();
            if (!res.ok || !data.id || !data.url) throw new Error(`Stripe: ${data?.error?.message ?? res.status}`);
            ref = data.id;
            url = data.url;
        } else {
            const token = await paypalToken();
            const res = await fetch(`${paypalBase()}/v2/checkout/orders`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    "PayPal-Request-Id": `fang-order-${paymentId}`,
                },
                body: JSON.stringify({
                    intent: "CAPTURE",
                    purchase_units: [
                        {
                            reference_id: String(paymentId),
                            custom_id: String(paymentId),
                            description: productName,
                            amount: { currency_code: "USD", value: (priceCents / 100).toFixed(2) },
                        },
                    ],
                    payment_source: {
                        paypal: {
                            experience_context: {
                                return_url: `${site()}/api/paypal/return`,
                                cancel_url: `${site()}${WALLET_PATH}?payment=cancelled`,
                                user_action: "PAY_NOW",
                                shipping_preference: "NO_SHIPPING",
                            },
                        },
                    },
                }),
                cache: "no-store",
            });
            const data = await res.json();
            const link = (data.links ?? []).find((l: any) => l.rel === "payer-action" || l.rel === "approve");
            if (!res.ok || !data.id || !link?.href) throw new Error(`PayPal: ${data?.message ?? res.status}`);
            ref = data.id;
            url = link.href;
        }

        await dbPool.query(`UPDATE payments SET provider_ref = $2 WHERE id = $1`, [paymentId, ref]);
        return NextResponse.json({ url });
    } catch (error) {
        console.error("Checkout error:", error);
        return fail(500, "Couldn't start the payment. Please try again.");
    }
}