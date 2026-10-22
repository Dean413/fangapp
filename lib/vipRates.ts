// lib/vipRates.ts
// The VIP plans in one place, for the browser and the server.
// (No "server-only" here on purpose: the wallet screens use it too.)
export const VIP_PLAN_INFO = {
    weekly: { days: 7, priceCents: 999, freeUnlocksPerDay: 3, dailyBonusCoins: 10, topUpPercent: 10 },
    monthly: { days: 30, priceCents: 2999, freeUnlocksPerDay: 5, dailyBonusCoins: 20, topUpPercent: 15 },
} as const;

export type VipPlanId = keyof typeof VIP_PLAN_INFO;

export const isVipPlan = (value: unknown): value is VipPlanId =>
    value === "weekly" || value === "monthly";

// Extra coins a VIP gets on top-ups
export const VIP_TOPUP_PERCENT: Record<string, number> = {
    weekly: VIP_PLAN_INFO.weekly.topUpPercent,
    monthly: VIP_PLAN_INFO.monthly.topUpPercent,
};

export const formatUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// How much cheaper the monthly plan is than four weekly ones, in whole percent
export const monthlySavingPercent = () =>
    Math.round((1 - VIP_PLAN_INFO.monthly.priceCents / (VIP_PLAN_INFO.weekly.priceCents * 4)) * 100);