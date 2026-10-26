# Coins, VIP, payments and rewards

## Currencies and the wallet (`lib/wallet.ts`)

Every credit is a **lot** in `wallet_lots` with its own kind, remaining amount and optional expiry.
Every change is a row in `wallet_ledger`, which is **append-only** so balances can be audited.

| Currency / kind | Source | Monetary value | Expiry |
|---|---|---|---|
| `coin` / `base` | Bought with money | Yes — `net_value_per_coin` = price ÷ base coins | Never |
| `coin` / `bonus` | Sign-up, package bonus, check-in, reading rewards | No | Varies (see below) |
| `coin` / `vip_bonus` | VIP top-up bonus, VIP daily coins | No | 7 days |
| `gem` / `earned` | Top-ups, reading gem | No | Never |

`getWalletBalance(userId)` sums non-expired lots → `{ coins, bonusCoins, vipBonusCoins, gems, nextExpiry }`.
Wallet history (`lib/transaction.ts`, `GET /api/wallet/transactions`) reads the ledger and adds synthetic
"Expired" entries for bonus lots that ran out unused, so the running balance matches. Labels are
translated via `lib/coinLabels.ts`.

**Sign-up bonus:** 50 bonus coins, expire after 2 days, once per account (unique index on
`source = 'signup_bonus'`).

## Chapter unlocks (`lib/unlock.ts`)

A book's paywall starts at `start_paywall_chapter` from its latest **signed contract** (`contracts`).
Chapters before it are free; the writer reads their own book free.

Price by chapter length:

| Words | ≤1000 | ≤1500 | ≤2000 | ≤2500 | more |
|---|---|---|---|---|---|
| Coins | 25 | 35 | 45 | 55 | 65 |

`unlockChapter()` (one transaction, account row locked):
1. Account must be `active`.
2. Paid chapters unlock **in order** — fails with `EARLIER_LOCKED` if an earlier paid chapter is still locked.
3. A VIP with free unlocks left today gets it free (`method = 'vip'`, no creator earnings).
4. Otherwise the unlock row is claimed first (so a repeat never charges), then coins are taken:
   bonus/VIP-bonus first (soonest expiry first), then bought coins (oldest first).
5. Each lot spend writes `wallet_ledger` and `coin_spends` (net revenue, story, chapter, creator, contract)
   — the basis for writer earnings in FangWriters.

Result codes: `NOT_FOUND`, `NOT_PAID` (chapter is free), `NOT_ENOUGH`, `ACCOUNT`, `EARLIER_LOCKED`.
"Auto-Unlock Next Chapter" per book is stored in `reader_auto_unlock` (`POST /api/unlocks/auto`).

## Coin packages (`lib/payments/packages.ts`)

| Coins | Bonus | Price |
|---|---|---|
| 500 | 50 | $4.99 |
| 1000 | 150 | $9.99 |
| 2000 | 550 | $19.99 |
| 3500 | 1500 | $34.99 |
| 4000 | 1850 | $39.99 |

Every top-up also gives **3 gems**. Package bonus coins expire after **14 days**. An active VIP gets an
extra **10 % (weekly) / 15 % (monthly)** of the base coins as `vip_bonus` (7-day expiry).

## VIP (`lib/vipRates.ts`, `lib/vip.ts`)

| Plan | Price | Length | Free unlocks / day | Daily bonus coins | Top-up bonus |
|---|---|---|---|---|---|
| weekly | $9.99 | 7 days | 3 | 10 | 10 % |
| monthly | $29.99 | 30 days | 5 | 20 | 15 % |

- VIP is a **recurring subscription** (Stripe subscription / PayPal billing plan). Each successful charge
  adds one period in `vip_subscriptions`, queued after any time still left.
- "Today" is the reader's own day (`users.timezone`, set by `POST /api/vip/daily`, changeable once per 24 h).
- Daily bonus coins are credited once per day by `syncVipDay()` when the app opens (`vip_daily_bonus`).
  They expire 7 days after they are given, even if the plan ends sooner (intended).
- Cancelling (`POST /api/vip/subscription { action: "cancel" }`) stops renewal; VIP runs to the end of the
  paid period. `resume` switches renewal back on. Billing state lives in `vip_billing`
  (`pending → active → cancelled / ended`).

> All VIP numbers live in `lib/vipRates.ts` (safe to import in the browser too). Checkout, payments,
> free unlocks, daily coins and the top-up cards all read them from there.

## Payment flow

```
Wallet page ──POST /api/checkout { provider, coins | plan }──► payments / vip_billing row (pending)
            ◄─────────────── { url } (Stripe Checkout / PayPal approve link)
Reader pays at provider
Provider ──► /api/stripe/return  or  /api/paypal/return   (reader's browser; verify + credit, redirect to /profile/wallet)
Provider ──► /api/webhooks/stripe  or  /api/webhooks/paypal (server-to-server; verify + credit)
```

- **Coins:** `creditPayment()` (`lib/payments/credit.ts`) flips the payment `pending → paid` once and
  creates the base / bonus / VIP-bonus / gem lots. Amount and currency (USD) are checked against the
  stored price before crediting.
- **VIP:** `creditVipPeriod()` (`lib/payments/subscription.ts`) matches the subscription to `vip_billing`,
  checks the exact plan price, de-duplicates (unique `provider_txn`, and any paid VIP charge within half
  a period counts as a repeat), then adds a period.
- Both return page and webhook may credit; whichever arrives first wins, the other is a no-op.
- Limits: max 10 checkout attempts per user per 10 minutes; buying VIP while VIP is active returns 409.
- Idempotency keys are sent to Stripe (`fang-checkout-<id>`, `fang-sub-<id>`) and PayPal (`PayPal-Request-Id`).

## Free rewards

**Daily check-in** (`lib/reward.ts`, `/api/rewards/daily-checkin`) — a 7-day loop:
5, 10, 15, 20, 25, 30, 35 bonus coins. Next claim opens 24 h after the last; more than 48 h breaks the
streak back to Day 1. Coins expire after 2 days.

**Reading time** (`lib/readingReward.ts`, `/api/rewards/reading/*`)
- The reader page sends `POST /api/rewards/reading/heartbeat` every 30 s while active. The server counts
  real time between beats (max 60 s per beat); beats < 25 s apart are ignored; a gap > 75 s counts nothing.
- Time accumulates in 24-hour periods (`reading_time`).
- Milestones, claimed once per period (`POST /api/rewards/reading/claim { minutes }`):
  15 min → 5, 30 → 8, 60 → 15, 90 → 22 bonus coins (2-day expiry).
- At 30 minutes, **1 gem** is granted automatically once per period.
- The same heartbeat feeds reading stats and the reading streak (`lib/readingStat.ts`, `reading_daily`).
