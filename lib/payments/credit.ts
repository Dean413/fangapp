// lib/payments/credit.ts
// Turns a paid payment into what the reader bought: wallet coins, or a VIP plan.
// Safe to call many times for the same payment (webhook retries, double page loads):
// only the first call does anything.
import "server-only";
import { withTransaction } from "@/lib/auth/transaction";
import { VIP_PLAN_INFO, isVipPlan } from "@/lib/vipRates";
import { BONUS_EXPIRY_DAYS, VIP_BONUS_EXPIRY_DAYS } from "./packages";

export async function creditPayment(paymentId: number, providerTxn: string | null): Promise<boolean> {
    return withTransaction(async (client) => {
        // Claim it: only a still-pending payment can be paid
        const { rows } = await client.query(
            `UPDATE payments SET status = 'paid', paid_at = now(), provider_txn = $2
             WHERE id = $1 AND status = 'pending'
             RETURNING *`,
            [paymentId, providerTxn]
        );
        const p = rows[0];
        if (!p) return false;

        // ---- A VIP plan ----
        if (p.product === "vip") {
            const plan: unknown = p.vip_plan;
            if (!isVipPlan(plan)) throw new Error(`Payment ${p.id} has no valid VIP plan`);
            const days = VIP_PLAN_INFO[plan].days;

            // One at a time per reader, then queue after any plan they still have
            await client.query(`SELECT 1 FROM users WHERE id = $1 FOR UPDATE`, [p.user_id]);
            await client.query(
                `INSERT INTO vip_subscriptions (user_id, plan, starts_at, ends_at, source, external_id)
                 SELECT $1, $2, s.start, s.start + make_interval(days => $3::int), $4, $5
                 FROM (SELECT GREATEST(now(), COALESCE(MAX(ends_at), now())) AS start
                       FROM vip_subscriptions WHERE user_id = $1 AND ends_at > now()) s`,
                [p.user_id, p.vip_plan, days, p.provider, `payment:${p.id}`]
            );
            return true;
        }

        // ---- Coins ----
        async function lot(currency: "coin" | "gem", kind: string, amount: number, source: string, expiresDays: number | null, netPerCoin: string | null) {
            if (amount <= 0) return;
            const { rows: made } = await client.query(
                `INSERT INTO wallet_lots (user_id, currency, kind, amount, remaining, source, expires_at, net_value_per_coin)
                 VALUES ($1, $2, $3, $4, $4, $5,
                         CASE WHEN $6::int IS NULL THEN NULL ELSE now() + make_interval(days => $6::int) END,
                         $7::numeric)
                 RETURNING id`,
                [p.user_id, currency, kind, amount, source, expiresDays, netPerCoin]
            );
            await client.query(
                `INSERT INTO wallet_ledger (user_id, lot_id, currency, kind, delta, reason, ref_type, ref_id)
                 VALUES ($1, $2, $3, $4, $5, 'topup', 'payment', $6)`,
                [p.user_id, made[0].id, currency, kind, amount, String(p.id)]
            );
        }

        // What the reader paid, per base coin (only base coins carry monetary value)
        const net = (p.price_cents / 100 / p.base_coins).toFixed(6);

        await lot("coin", "base", p.base_coins, "topup", null, net);
        await lot("coin", "bonus", p.bonus_coins, "topup_bonus", BONUS_EXPIRY_DAYS, null);
        await lot("coin", "vip_bonus", p.vip_bonus_coins, "topup_vip_bonus", VIP_BONUS_EXPIRY_DAYS, null);
        await lot("gem", "earned", p.gems, "topup_gem", null, null);
        return true;
    });
}