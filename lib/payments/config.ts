
import "server-only";

const isProduction = process.env.NODE_ENV === "production";

export const PAYMENT_CONFIG = {
    // Where readers come back to after paying: SITE_URL (the same address sign-in uses), otherwise
    // the Vercel site on the live server and localhost during npm run dev
    siteUrl: process.env.SITE_URL || (isProduction
        ? "https://fang-app.vercel.app"
        : "http://localhost:3000"),

    // Stripe
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",

    // PayPal
    paypalClientId: process.env.PAYPAL_CLIENT_ID || "",
    paypalSecret: process.env.PAYPAL_SECRET || "",
    // PAYPAL_ENV=live uses real PayPal; anything else (or unset) uses the sandbox
    paypalLive: process.env.PAYPAL_ENV === "live",


    stripePrices: {
        weekly: process.env.STRIPE_PRICE_WEEKLY || "",
        monthly: process.env.STRIPE_PRICE_MONTHLY || "",
    },
    paypalPlans: {
        weekly: process.env.PAYPAL_PLAN_WEEKLY || "",
        monthly: process.env.PAYPAL_PLAN_MONTHLY || "",
    },
    paypalWebhookId: process.env.PAYPAL_WEBHOOK_ID || "",
};
