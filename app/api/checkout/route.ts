// app/api/checkout/route.ts
// Starts a Stripe or PayPal payment: a coin package (one-time) or a VIP plan (recurring subscription).
// The browser only says which one and which provider; price, coins and the VIP bonus are decided here.
import { NextRequest, NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getVipStatus } from "@/lib/vip";
import { PAYMENT_CONFIG } from "@/lib/payments/config";
import { findPackage, TOPUP_GEMS } from "@/lib/payments/packages";
import { stripePost } from "@/lib/payments/stripe";
import { paypalBase, paypalToken } from "@/lib/payments/paypal";
import { VIP_TOPUP_PERCENT, isVipPlan, type VipPlanId } from "@/lib/vipRates";

// Where readers land after paying (change to your wallet page)
const WALLET_PATH = "/profile/wallet";

const site = () => PAYMENT_CONFIG.siteUrl.replace(/\/$/, "");
const fail = (status: number, message: string) => NextResponse.json({ message }, { status });

// ---------- VIP: recurring subscription ----------
async function startSubscription(user: { id: any; email?: string | null }, plan: VipPlanId, provider: "stripe" | "paypal") {
    // Already VIP (or already subscribed): nothing to buy
    const current = await getVipStatus(user.id);
    if (current.active) return fail(409, "You already have an active VIP plan");
    const { rows: active } = await dbPool.query(
        `SELECT 1 FROM vip_billing WHERE user_id = $1 AND status = 'active' LIMIT 1`,
        [user.id]
    );
    if (active.length > 0) return fail(409, "You already have an active VIP plan");

    // No piling up of unfinished attempts
    const { rows: recent } = await dbPool.query(
        `SELECT count(*)::int AS n FROM vip_billing WHERE user_id = $1 AND created_at > now() - interval '10 minutes'`,
        [user.id]
    );
    if (recent[0].n >= 10) return fail(429, "Too many attempts. Please wait a few minutes.");

    const priceId = PAYMENT_CONFIG.stripePrices[plan];
    const planId = PAYMENT_CONFIG.paypalPlans[plan];
    if ((provider === "stripe" && !priceId) || (provider === "paypal" && !planId)) {
        console.error("Missing subscription id in config for", provider, plan);
        return fail(500, "Couldn't start the payment. Please try again.");
    }

    const { rows } = await dbPool.query(
        `INSERT INTO vip_billing (user_id, provider, plan) VALUES ($1, $2, $3) RETURNING id`,
        [user.id, provider, plan]
    );
    const billingId: number = rows[0].id;

    if (provider === "stripe") {
        const form = new URLSearchParams({
            mode: "subscription",
            client_reference_id: String(billingId),
            success_url: `${site()}/api/stripe/return?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${site()}${WALLET_PATH}?payment=cancelled`,
            "line_items[0][price]": priceId,
            "line_items[0][quantity]": "1",
            "metadata[billing_id]": String(billingId),
            "subscription_data[metadata][billing_id]": String(billingId),
        });
        if (user.email) form.set("customer_email", user.email);
        const { ok, data } = await stripePost("/v1/checkout/sessions", form, `fang-sub-${billingId}`);
        if (!ok || !data?.id || !data?.url) throw new Error(`Stripe: ${data?.error?.message ?? "failed"}`);
        await dbPool.query(`UPDATE vip_billing SET provider_ref = $2 WHERE id = $1`, [billingId, data.id]);
        return NextResponse.json({ url: data.url });
    }

    const token = await paypalToken();
    const res = await fetch(`${paypalBase()}/v1/billing/subscriptions`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "PayPal-Request-Id": `fang-sub-${billingId}`,
        },
        body: JSON.stringify({
            plan_id: planId,
            custom_id: String(billingId),
            ...(user.email ? { subscriber: { email_address: user.email } } : {}),
            application_context: {
                brand_name: "FANG",
                user_action: "SUBSCRIBE_NOW",
                shipping_preference: "NO_SHIPPING",
                return_url: `${site()}/api/paypal/return`,
                cancel_url: `${site()}${WALLET_PATH}?payment=cancelled`,
            },
        }),
        cache: "no-store",
    });
    const data = await res.json();
    const link = (data.links ?? []).find((l: any) => l.rel === "approve");
    if (!res.ok || !data.id || !link?.href) throw new Error(`PayPal: ${data?.message ?? res.status}`);
    await dbPool.query(
        `UPDATE vip_billing SET provider_ref = $2, provider_subscription_id = $2 WHERE id = $1`,
        [billingId, data.id]
    );
    return NextResponse.json({ url: link.href });
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
        if (buyingVip) return await startSubscription(user, plan as VipPlanId, provider);

        // ---------- Coins: one-time payment ----------
        // No piling up of unfinished payments
        const { rows: recent } = await dbPool.query(
            `SELECT count(*)::int AS n FROM payments WHERE user_id = $1 AND created_at > now() - interval '10 minutes'`,
            [user.id]
        );
        if (recent[0].n >= 10) return fail(429, "Too many attempts. Please wait a few minutes.");

        // What this reader gets, fixed now and shown to them in the popup
        const vip = await getVipStatus(user.id);
        const vipPercent = vip.active && vip.plan ? VIP_TOPUP_PERCENT[vip.plan] ?? 0 : 0;
        const vipBonus = Math.floor((pkg!.coins * vipPercent) / 100);
        const priceCents = pkg!.priceCents;
        const productName = `${(pkg!.coins + pkg!.bonus + vipBonus).toLocaleString("en-US")} FANG Coins`;
        const { rows } = await dbPool.query(
            `INSERT INTO payments (user_id, provider, product, price_cents, base_coins, bonus_coins, vip_bonus_coins, vip_plan, gems)
             VALUES ($1, $2, 'coins', $3, $4, $5, $6, $7, $8)
             RETURNING id`,
            [user.id, provider, priceCents, pkg!.coins, pkg!.bonus, vipBonus, vipPercent > 0 ? vip.plan : null, TOPUP_GEMS]
        );
        const paymentId: number = rows[0].id;

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
            const { ok, data } = await stripePost("/v1/checkout/sessions", form, `fang-checkout-${paymentId}`);
            if (!ok || !data?.id || !data?.url) throw new Error(`Stripe: ${data?.error?.message ?? "failed"}`);
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