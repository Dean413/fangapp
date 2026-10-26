# API reference

All routes are under `/api`. "Auth" = needs the session cookies (401 when signed out). Errors are
JSON `{ message }` (auth routes also add `code`), translated into the reader's language.
Each route file starts with a comment describing its input and output in more detail.

## Auth — `app/api/auth/`

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /auth/signup` | | Create account, email sign-up code |
| `POST /auth/verify-email` | | Check sign-up code → sign in + 50 bonus coins |
| `POST /auth/resend-code` | | Resend sign-up code (1/min, 10/day) |
| `POST /auth/login` | | Email + password sign-in (may require 2FA) |
| `POST /auth/verify-login` | | 2FA step 2 `{ email, code }` |
| `POST /auth/login-code` | | Resend 2FA code |
| `POST /auth/logout` | | Clear session cookies |
| `POST /auth/forgot-password` | | Email reset code |
| `POST /auth/verify-reset-code` | | Check reset code → `reset_session` cookie |
| `POST /auth/reset-password` | | Set new password with `reset_session` |
| `GET /auth/google/login`, `GET /auth/facebook/login` | | Start OAuth (`?next=`, `?link=1`) |
| `GET /auth/google/callback`, `GET /auth/facebook/callback` | | OAuth return |
| `GET /auth/user` | Auth | Current account, reader profile and wallet |
| `POST /auth/profile` | Auth | Save profile fields (name, username, bio, genres…) |
| `POST /auth/avatar`, `POST /auth/cover` | Auth | Upload profile / cover image (≤ 3 MB) |

## Settings — `app/api/settings/`

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /settings` | Auth | Account settings |
| `POST /settings/password` | Auth | Change / set password |
| `POST /settings/two-factor` | Auth | `{ enabled, password }` |
| `POST /settings/email` → `POST /settings/email/confirm` | Auth | Change email (code to new address) |
| `DELETE /settings/social` | Auth | Unlink Google / Facebook |
| `PUT /settings/notifications` | Auth | `{ newChapters, rewards, replies, emailUpdates }` |
| `POST /settings/delete/code` | Auth | Email deletion code (password-less accounts) |
| `POST /settings/delete` | Auth | Delete account `{ password }` or `{ code }` |

## Catalogue

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /stories` | | List: `genre, status, short, sort, exclude, language, limit` |
| `GET /stories/[slug]` | | Book details |
| `GET /stories/[slug]/chapters` | optional | Chapter list with lock state for the viewer |
| `GET /stories/[slug]/chapters/[chapterNumber]` | optional | One chapter (full if free/unlocked, else preview + price) |
| `POST /stories/[slug]/view` | optional | Count a view (once per reader per book) |
| `GET /stories/you-may-like` | | `?book=&language=&limit=` |
| `GET /search` | | `?q=&language=&limit=` |
| `GET /genres` | | Genres with visible stories + pickable favourite genres |
| `GET /option-names` | | `?locale=` translated genre/tag names |
| `GET /recommended` | Auth | Recommended row from favourite genres |
| `GET /rankings` | | `?locale=&period=` tabs and lists |
| `GET /rankings/[id]` | | `?audience=&type=` books of a list |

## Reading, library, unlocks

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /library` | Auth | `?tab=reading\|viewed\|finished` + saved ids |
| `POST /library` | Auth | `{ id }` save a book |
| `DELETE /library` | Auth | `{ ids, from }` remove |
| `GET /library/status` | Auth | `?id=` saved? last chapter? |
| `GET /library/continue` | Auth | `?limit=` Continue Reading |
| `POST /library/progress` | Auth | `{ id, chapter }` record opened chapter |
| `POST /unlocks` | Auth | `{ book, chapter }` unlock with coins / VIP; returns chapter + wallet |
| `POST /unlocks/auto` | Auth | `{ book, enabled }` auto-unlock next chapter |
| `GET /reading-stats` | Auth | `?range=year\|month\|lastYear` |

## Wallet, payments, VIP, rewards

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /wallet/transactions` | Auth | `?filter=&from=&to=&before=` history page |
| `GET /wallet/transactions/[id]` | Auth | One entry |
| `POST /checkout` | Auth | `{ provider: "stripe"\|"paypal", coins }` or `{ provider, plan }` → `{ url }` |
| `GET /stripe/return` | | Stripe success redirect → verify, credit, go to wallet |
| `GET /paypal/return` | | PayPal approve redirect → capture/verify, credit, go to wallet |
| `POST /webhooks/stripe` | signature | Stripe events |
| `POST /webhooks/paypal` | verified with PayPal | PayPal subscription events |
| `GET /vip/status` | Auth | VIP status and free unlocks left |
| `POST /vip/daily` | Auth | Save timezone, credit today's VIP coins |
| `GET /vip/subscription` | Auth | Renewing? resumable? |
| `POST /vip/subscription` | Auth | `{ action: "cancel"\|"resume" }` (no body = cancel) |
| `GET /rewards/daily-checkin` / `POST` | Auth | Check-in status / claim |
| `GET /rewards/reading` | Auth | Reading time and milestones |
| `POST /rewards/reading/heartbeat` | Auth | "Still reading" (every 30 s) |
| `POST /rewards/reading/claim` | Auth | `{ minutes: 15\|30\|60\|90 }` |

## Community

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /reviews` | optional | `?book=&before=` reviews, average, own review, eligibility |
| `POST /reviews` | Auth | `{ book, rating, content }` create/update |
| `DELETE /reviews/[id]` | Auth | Delete own review |
| `POST /reviews/[id]/like` | Auth | `{ like }` |
| `GET /reviews/[id]/replies` / `POST` | optional / Auth | `?after=` / `{ content }` |
| `DELETE /review-replies/[id]` | Auth | Delete own reply |
| `GET /reviews/mine` | Auth | My reviews |
| `POST /reviews/prompt` | Auth | `{ book, chapter }` → `{ show }` |
| `GET /comments` / `POST` | optional / Auth | `?chapter=&before=` / `{ chapterId, content, parentId? }` |
| `DELETE /comments/[id]` | Auth | Delete own comment (and its replies) |
| `POST /comments/[id]/like` | Auth | `{ like }` |
| `GET /comments/mine` | Auth | My comments |
| `POST /reports` | Auth | `{ type, id, reason, details? }` |
| `POST /reports/book` | Auth | multipart: `book, reason, link?, details?, files` |
| `POST /authors/[slug]/follow` / `DELETE` | Auth | Follow / unfollow |
| `GET /authors/following` | Auth | Followed authors |
| `GET /notifications` | Auth | `?tab=&before=` |
| `GET /notifications/unread` | Auth | Unread count |
| `POST /notifications/read` | Auth | `{ ids }` or `{ all: true }` |

## Misc

| Method & path | Purpose |
|---|---|
| `GET/POST/PUT/PATCH/DELETE /health` | Health check |
