// lib/payments/paypal.ts
// Small helpers for talking to PayPal.
import "server-only";
import { PAYMENT_CONFIG } from "./config";

export const paypalBase = () => (PAYMENT_CONFIG.paypalLive ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");

export async function paypalToken(): Promise<string> {
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