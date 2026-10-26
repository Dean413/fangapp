# Configuration

## Environment variables

Put these in `.env.local` for development (ignored by git) and in the host's environment for production.

| Variable | Used by | Required | Notes |
|---|---|---|---|
| `DATABASE_URL` | `lib/db.ts` | yes | Postgres connection string. SSL is on (without cert verification) unless the URL contains `localhost`. Pool size 10. |
| `SITE_URL` | `lib/auth/authConfig.ts`, `lib/payments/config.ts` | prod | Public site address, no trailing slash. Used for Google/Facebook callbacks and for where readers return after paying. Leave unset locally: sign-in then uses the address you opened, payments use `http://localhost:3000` (`https://fang-app.vercel.app` on the live server). |
| `ALLOWED_DEV_ORIGINS` | `next.config.ts` | no | `npm run dev` only. Comma-separated extra addresses allowed to open the dev server besides localhost, e.g. a phone on your network (`10.57.36.200`). |
| `JWT_ACCESS_SECRET` | `lib/auth/token.ts` | prod | Signs the 30-minute `fang_access` cookie. Missing in production = sign-in throws. |
| `JWT_REFRESH_SECRET` | `lib/auth/token.ts` | prod | Signs the 30-day `fang_refresh` cookie. |
| `EMAIL_CODE` | `lib/auth/emailCode.ts` | prod | HMAC pepper for the 6-digit email codes. |
| `RESEND_API_KEY` | `lib/auth/email.tsx` | yes | Sends code emails from `no-reply@fangapp.io`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | `lib/auth/oauth.ts` | for Google sign-in | |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | `lib/auth/oauth.ts` | for Facebook sign-in | |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME` | `lib/storage.ts` | for uploads | `storageReady()` is false until all four are set. |
| `STRIPE_SECRET_KEY` | `lib/payments/stripe.ts` | for Stripe | |
| `STRIPE_WEBHOOK_SECRET` | `app/api/webhooks/stripe` | for Stripe | Signature checked; events older than 5 minutes rejected. |
| `STRIPE_PRICE_WEEKLY` / `STRIPE_PRICE_MONTHLY` | checkout | for VIP via Stripe | Recurring Price ids. |
| `PAYPAL_ENV` | `lib/payments/config.ts` | no | `live` = real PayPal. Anything else, or unset, = sandbox. |
| `PAYPAL_CLIENT_ID` / `PAYPAL_SECRET` | `lib/payments/paypal.ts` | for PayPal | Must match `PAYPAL_ENV` (sandbox keys with sandbox, live keys with live). |
| `PAYPAL_PLAN_WEEKLY` / `PAYPAL_PLAN_MONTHLY` | checkout | for VIP via PayPal | Billing plan ids. |
| `PAYPAL_WEBHOOK_ID` | `app/api/webhooks/paypal` | for PayPal | Used to verify webhook messages with PayPal. |
| `STORY_TENANT` | `lib/stories.ts`, `lib/content.ts`, `lib/authors.ts`, … | no | Only show books distributed to this tenant (`stories.tenants`). Unset = all. |

## Hard-coded settings (change in code)

| Setting | Where | Current value |
|---|---|---|
| App name, support email, sender, logo | `lib/auth/authConfig.ts` | `Fang`, `support@fangapp.io`, `no-reply@fangapp.io` |
| Public account id prefix | `lib/auth/authConfig.ts` → `publicIdPrefix` | `FR` |
| Remote image host | `next.config.ts` → `images.remotePatterns` | `fang-writer-app-files.s3.us-east-1.amazonaws.com` |
| Coin packages, gems, bonus expiry | `lib/payments/packages.ts` | see [economy.md](economy.md) |
| VIP plans (price, length, perks, top-up bonus) | `lib/vipRates.ts` only | see [economy.md](economy.md) |
| Old address redirect `/dcma` → `/dmca` | `next.config.ts` → `redirects()` | permanent (308) |
| Locales | `i18n/routing.ts` and `proxy.ts` | `en fr de tr pt pl ja it es` |

## Webhooks to register

| Provider | URL | Events |
|---|---|---|
| Stripe | `https://<site>/api/webhooks/stripe` | `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted` |
| PayPal | `https://<site>/api/webhooks/paypal` | Subscription payment completed / cancelled / expired events |

OAuth redirect URIs: `https://<site>/api/auth/google/callback` and `https://<site>/api/auth/facebook/callback`.

## Deployment

`next.config.ts` sets `output: "standalone"`, so `npm run build` produces `.next/standalone` that can run
with `node server.js` (copy `public/` and `.next/static` alongside). Set `SITE_URL` on
any host other than `fang-app.vercel.app`, and `PAYPAL_ENV=live` (with live PayPal keys) when going live.
