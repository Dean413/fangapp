
import "server-only";

const isProduction = process.env.NODE_ENV === "production";

export const PAYMENT_CONFIG = {
    // Your site address, without a trailing slash
    siteUrl: isProduction
        ? "https://fang-app.vercel.app"
        : "http://localhost:3000",

    // Stripe
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",

    // PayPal
    paypalClientId: process.env.PAYPAL_CLIENT_ID || "",
    paypalSecret: process.env.PAYPAL_SECRET || "",
    paypalLive: false,


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
