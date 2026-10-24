// app/api/vip/subscription/route.ts
// GET:  does the reader's VIP renew by itself (recurring), or was renewal switched off while VIP is still running (resumable)?
// POST: { action: "cancel" } switches renewal off, { action: "resume" } switches it back on.
//       Without a body it cancels (what the VIP card sends).
//       Switching off never ends VIP early: it runs to the end of the period already paid for.
import { NextRequest, NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getVipStatus } from "@/lib/vip";
import { stripePost } from "@/lib/payments/stripe";
import { paypalBase, paypalToken } from "@/lib/payments/paypal";
import { setBillingStatus, resumeBilling } from "@/lib/payments/subscription";

async function billingWithStatus(userId: any, status: "active" | "cancelled") {
    const { rows } = await dbPool.query(
        `SELECT id, provider, plan, provider_subscription_id
         FROM vip_billing WHERE user_id = $1 AND status = $2 AND provider_subscription_id IS NOT NULL
         ORDER BY id DESC LIMIT 1`,
        [userId, status]
    );
    return rows[0] ?? null;
}

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ recurring: false, resumable: false });

    const active = await billingWithStatus(user.id, "active");
    if (active) return NextResponse.json({ recurring: true, resumable: false, plan: active.plan });

    // Renewal was switched off but VIP is still running: it can be switched back on
    const vip = await getVipStatus(user.id);
    const stopped = vip.active ? await billingWithStatus(user.id, "cancelled") : null;
    return NextResponse.json({ recurring: false, resumable: !!stopped, plan: stopped?.plan ?? null });
}

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Please sign in first" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const action = body?.action === "resume" ? "resume" : "cancel";

    try {
        // ---------- Switch renewal off ----------
        if (action === "cancel") {
            const billing = await billingWithStatus(user.id, "active");
            if (!billing) return NextResponse.json({ message: "No active subscription" }, { status: 404 });

            if (billing.provider === "stripe") {
                // Stop at the end of the paid period
                const { ok } = await stripePost(
                    `/v1/subscriptions/${encodeURIComponent(billing.provider_subscription_id)}`,
                    new URLSearchParams({ cancel_at_period_end: "true" })
                );
                if (!ok) throw new Error("Stripe cancel failed");
            } else {
                // Suspend (not cancel) so it can be switched back on
                const token = await paypalToken();
                const res = await fetch(
                    `${paypalBase()}/v1/billing/subscriptions/${encodeURIComponent(billing.provider_subscription_id)}/suspend`,
                    {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                        body: JSON.stringify({ reason: "Renewal switched off by the reader" }),
                        cache: "no-store",
                    }
                );
                if (!res.ok && res.status !== 422) throw new Error("PayPal suspend failed"); // 422 = already suspended
            }

            await setBillingStatus(billing.provider, billing.provider_subscription_id, "cancelled");
            return NextResponse.json({ ok: true });
        }

        // ---------- Switch renewal back on (only while the paid VIP period is still running) ----------
        const vip = await getVipStatus(user.id);
        if (!vip.active) {
            return NextResponse.json({ message: "Your VIP has ended. Please subscribe again." }, { status: 409 });
        }
        if (await billingWithStatus(user.id, "active")) return NextResponse.json({ ok: true });

        const billing = await billingWithStatus(user.id, "cancelled");
        if (!billing) return NextResponse.json({ message: "Please subscribe again after your VIP ends." }, { status: 404 });

        if (billing.provider === "stripe") {
            const { ok } = await stripePost(
                `/v1/subscriptions/${encodeURIComponent(billing.provider_subscription_id)}`,
                new URLSearchParams({ cancel_at_period_end: "false" })
            );
            if (!ok) {
                return NextResponse.json({ message: "This subscription can't be switched back on. Please subscribe again after your VIP ends." }, { status: 409 });
            }
        } else {
            const token = await paypalToken();
            const res = await fetch(
                `${paypalBase()}/v1/billing/subscriptions/${encodeURIComponent(billing.provider_subscription_id)}/activate`,
                {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ reason: "Renewal switched back on by the reader" }),
                    cache: "no-store",
                }
            );
            // 204 = done, 422 = already active. Anything else (for example an older, fully cancelled subscription) can't be resumed.
            if (!res.ok && res.status !== 422) {
                return NextResponse.json({ message: "This subscription can't be switched back on. Please subscribe again after your VIP ends." }, { status: 409 });
            }
        }

        await resumeBilling(billing.provider, billing.provider_subscription_id);
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("VIP subscription change error:", error);
        return NextResponse.json({ message: "Couldn't change it. Please try again." }, { status: 500 });
    }
}