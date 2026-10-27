// lib/coinLabels.ts
// Names of wallet entries (transaction history and notifications) in the reader's language,
// worked out from the entry's reason and ref the same way lib/transaction.ts and lib/notifications.ts do.
// `t` is useTranslations("Coins").
type T = (key: string, values?: Record<string, string | number>) => string;

// Where bonus coins came from (for expired coins)
export function coinSource(t: T, refId: string | null | undefined): string {
    if (refId === "signup_bonus") return t("signupBonus");
    if (refId === "daily_checkin") return t("dailyCheckin");
    if (refId === "reading_time") return t("readingReward");
    return t("bonusCoins");
}

export function coinDescription(t: T, reason: string | undefined, refId: string | null | undefined, fallback = ""): string {
    switch (reason) {
        case "signup_bonus": return t("signupBonus");
        case "daily_checkin": return refId ? t("dailyCheckinDay", { day: refId }) : t("dailyCheckin");
        case "reading_time": return refId ? t("readingRewardMinutes", { minutes: refId }) : t("readingReward");
        case "purchase": return t("topUp");
        case "unlock": return t("chapterUnlock");
        case "vip": return t("vip");
        case "gift": return t("gift");
        case "expired": return coinSource(t, refId);
        default: return fallback || (reason ?? "").replace(/_/g, " ");
    }
}

// The short label for the Type column / badge
export function coinType(t: T, reason: string | undefined, amount: number): string {
    switch (reason) {
        case "signup_bonus": return t("typeBonus");
        case "daily_checkin":
        case "reading_time": return t("typeReward");
        case "purchase": return t("typeTopUp");
        case "unlock": return t("typeUnlock");
        case "gift": return t("typeGift");
        case "expired": return t("typeExpired");
        default: return amount > 0 ? t("typeAdded") : t("typeSpent");
    }
}
