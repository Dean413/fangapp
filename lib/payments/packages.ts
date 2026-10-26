// lib/payments/packages.ts
// The ONLY place that decides prices and coins. The browser sends just the package size.
import "server-only";

export const TOPUP_PACKAGES = [
    { coins: 500, bonus: 50, priceCents: 499 },
    { coins: 1000, bonus: 150, priceCents: 999 },
    { coins: 2000, bonus: 550, priceCents: 1999 },
    { coins: 3500, bonus: 1500, priceCents: 3499 },
    { coins: 4000, bonus: 1850, priceCents: 3999 },
] as const;

// Extra coins a VIP gets on top-ups: VIP_TOPUP_PERCENT in lib/vipRates.ts

export const TOPUP_GEMS = 3;            // gems for every top-up
export const BONUS_EXPIRY_DAYS = 14;    // package bonus coins
export const VIP_BONUS_EXPIRY_DAYS = 7; // VIP bonus coins

export const findPackage = (coins: unknown) => TOPUP_PACKAGES.find((p) => p.coins === coins) ?? null;