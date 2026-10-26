# Architecture

## Big picture

```
Browser ──► proxy.ts (next-intl locale middleware, pages only)
        ──► app/[locale]/...   pages (mostly client components)
                 │ fetch()
                 ▼
            app/api/...        route handlers (thin: parse input, check session, call lib/)
                 │
                 ▼
            lib/<domain>.ts    business rules + raw SQL ("server-only")
                 │
                 ▼
            PostgreSQL (shared with FangWriters)   S3   Resend   Stripe / PayPal
```

- **Pages** live under `app/[locale]/`. Most interactive pages are client components that call the
  `/api` routes. A few are server components that call `lib/` directly (home, collections, author page,
  legal pages, `stories/[genre]`).
- **Route handlers** in `app/api/` are kept thin. They read the session with `getCurrentUser()`
  (`lib/auth/session.ts`), validate input, and delegate to a `lib/` module.
- **`lib/` modules** own the rules. Each starts with a header comment describing the rules it enforces —
  read that first. Server-only modules import `"server-only"` so they can't be bundled into the browser.
- **Database access** goes through the single pool in `lib/db.ts` (`db` / `dbPool`, same object).
  Multi-step writes use `withTransaction()` from `lib/auth/transaction.ts`.

## Conventions worth knowing

- **The server decides all amounts.** Prices, coin packages, chapter prices, reward amounts and VIP
  benefits are constants in `lib/` (`lib/payments/packages.ts`, `lib/unlock.ts`, `lib/reward.ts`,
  `lib/readingReward.ts`, `lib/vipRates.ts`). The browser only sends identifiers ("package 1000",
  "plan monthly", "milestone 30").
- **Database clock, not app clock.** Time-based rules (check-in windows, reading time, VIP days) use
  Postgres `now()` so server and browser clocks don't matter.
- **Idempotent by construction.** Credits/claims use `INSERT … ON CONFLICT DO NOTHING RETURNING` or
  `UPDATE … WHERE status = 'pending'` so double clicks, multiple tabs and webhook retries never pay twice.
  Per-user races are serialised with `SELECT 1 FROM users WHERE id = $1 FOR UPDATE`.
- **No account enumeration.** Auth endpoints answer the same way for unknown, closed and real accounts,
  and unknown emails take as long as real ones.
- **Uploaded files are sniffed by their bytes** (PNG/JPEG/WebP/PDF), stored under random names in S3.
- **API messages are translation keys.** `lib/` returns `Msg` values (`"key"` or `msg("key", values)`,
  see `lib/i18n.ts`); routes translate them with `translateMsg()` into the reader's locale.
- **Tenant filter.** If `STORY_TENANT` is set, only books whose `stories.tenants` include it are shown.

## Client state (`lib/store/`)

| Store | Holds |
|---|---|
| `authStore.ts` | Signed-in user, profile and wallet (`fetchUser()` → `GET /api/auth/user`) |
| `auth-card-store.ts` | Which auth modal is open (sign-in / sign-up / forgot password) |
| `twoFactorStore.ts` | Email waiting for its 2FA code |
| `library-store.ts` | Saved book ids and library tabs (data lives on the account) |
| `notificationStore.ts` | Unread count; polled once a minute and on tab focus |
| `wallet-action-store.ts` | Wallet popups (top-up, VIP) |
| `toastStore.ts` | `toast()`, `toast.error()` … rendered by `components/toast.tsx` |

`lib/store/auth-provider.tsx` (mounted in `app/[locale]/layout.tsx`) loads the user on start, loads the
library when signed in, shows `?auth_error=<code>` OAuth errors as toasts, and renders the 2FA card.
`components/vip-sync.tsx` calls `POST /api/vip/daily` with the browser timezone when the app opens.
`components/i18n-bridge.tsx` gives stores access to translations via `tc()` (`lib/i18n-client.ts`).

## Layouts

- `app/layout.tsx` — `<html>`, Poppins font, `ThemeProvider`, `ToastHost`, `ProtectContent`
  (blocks copy, right-click, drag and Ctrl+C/X/A/S outside inputs and `.allow-select`).
- `app/[locale]/layout.tsx` — validates the locale, loads `messages/<locale>.json`, wraps everything in
  `NextIntlClientProvider` + `AuthProvider`, and renders `NavBar`, auth modals (`ModalRoot`) and `VipSync`.
- `app/[locale]/profile/layout.tsx` — client layout with sidebar / mobile nav; shows a sign-up prompt
  when signed out.

## Pages

| Route | What it is |
|---|---|
| `/` | Home: curated rows from the admin (`lib/home.ts`), banner, recommended, continue reading |
| `/stories`, `/stories/[genre]` | Catalogue with genre pills, filters and sorting |
| `/shorties`, `/shorties/[genre]` | Short novels |
| `/stories/[genre]/[slug]` | Book page: details, chapters, reviews, You May Like, report, add to library |
| `/stories/[genre]/[slug]/reader` | Reader: chapter text, unlock card, fonts/settings, TOC, comments, reading heartbeat |
| `/rankings` | Ranking tabs/lists from admin curation |
| `/search` | Search by title, author, tags |
| `/library` | Reading / viewed / finished tabs |
| `/collections/[id]` | One home collection in full |
| `/authors/[slug]` | Author page (pen name) with follow button |
| `/profile` | Profile, cover photo, avatar, favourite genres, reading stats |
| `/profile/wallet` | Balance, top-up, VIP, daily check-in, reading rewards |
| `/profile/transaction-history[/id]` | Wallet ledger with filters |
| `/profile/notifications` | Notification tabs |
| `/profile/reviews` | My reviews and comments |
| `/profile/settings` | Password, 2FA, email, linked accounts, notifications, delete account |
| `/profile/community`, `/profile/live-chat` | Placeholders with sample data; to be built soon |
| `/about`, `/faq`, `/terms-of-service`, `/privacy-policy`, `/refund-policy`, `/cookie-policy`, `/dmca`, `/community-guidelines` | Rendered by `components/legal-page.tsx` from `messages/legal/<locale>.json` |

## Components

Grouped by feature under `components/`: `authCards/` (sign-in, registration, forgot password, 2FA),
`book-controls/` (reader settings, fonts, TOC, gift, report, view tracker), `reader/` (chapter content,
unlock card, continue reading), `home/` (shelves, featured, trending), `cards/`, `reviews/`, `comments/`,
`profile-components/` (wallet cards, settings rows, notifications, transaction filter), `authors/`,
`stat-cards/`, `email/` (React Email template). Shared primitives: `Button`, `input`, `passwordInput`,
`otp`, `text-area`, `skeleton`, `toast`.
