# Authentication and accounts

All auth code is in `lib/auth/` and `app/api/auth/`.

## Who can sign in

Roles `reader` and `author` (writers reading with their FangWriters account) — `READER_ROLES` in
`lib/auth/token.ts`. Accounts with `account_status` `banned` or `deleted` cannot sign in; `suspended`
accounts can, so they can see why.

## Session (`lib/auth/session.ts`)

Two httpOnly, `SameSite=Lax` cookies (secure in production), HS256 JWTs with issuer `fang-reader`:

| Cookie | Lifetime | Purpose |
|---|---|---|
| `fang_access` | 30 min | Trusted on its own |
| `fang_refresh` | 30 days | Mints a new access cookie; the account is re-read from the DB each time |

`getCurrentUser()` returns `{ id, email, role }` or `null`. On refresh it ends the session if the account
is gone, closed, not a reader role, or the token was issued before `users.sessions_valid_after`
(set on password change/reset and account deletion → "sign out everywhere" takes effect within 30 min).
It also updates `users.last_active_at` at most every 5 minutes.

`startSession(user)` / `endSession()` set / clear both cookies (route handlers only).

## Email codes (`lib/auth/emailCode.ts`)

6-digit codes stored as HMAC-SHA256 with the `EMAIL_CODE` pepper in `email_codes`.

| Purpose | Valid for |
|---|---|
| `verify_email` | 15 min |
| `reset_password` | 10 min |
| `login_2fa` | 10 min |
| `change_email` | 15 min |
| `delete_account` | 10 min |

Max 5 attempts per code, resend after 60 s, max 10 sends per day. Emails are sent by
`lib/auth/email.tsx` (Resend + `components/email/verificationCodeEmail.tsx`) in the reader's language.

## Login rate limit (`lib/auth/loginLimit.ts`)

Per email: 10 tries / 15 min and 30 tries / 24 h, counted in `login_attempts` **before** the password is
checked. Wrong current-password attempts on settings pages count toward the same limit.

## Flows

**Sign-up** (`hooks/useAuth.ts`)
1. `POST /api/auth/signup` `{ fullName, email, password }` — creates the user + reader profile, emails a `verify_email` code.
2. `POST /api/auth/verify-email` `{ email, code }` — confirms the email, starts the session, grants the 50-coin sign-up bonus (once per account ever).
3. `POST /api/auth/profile` — optional profile step (username, bio, genres…). `POST /api/auth/resend-code` resends.

**Sign-in** (`hooks/useLoginAuth.ts`)
1. `POST /api/auth/login` `{ email, password }`.
2. If 2FA is on, a `login_2fa` code is emailed and the 2FA card opens → `POST /api/auth/verify-login` `{ email, code }`. `POST /api/auth/login-code` resends (only while a sign-in is waiting).

**Forgot password** (`hooks/forgotPasswordAuth.ts`)
1. `POST /api/auth/forgot-password` `{ email }` — same answer for any email.
2. `POST /api/auth/verify-reset-code` — right code sets a 10-minute one-time `reset_session` cookie scoped to `/api/auth/reset-password`.
3. `POST /api/auth/reset-password` `{ password }` — sets the password, confirms the email, signs out all other sessions, clears the login lock. Also lets Google/Facebook-only accounts set a password.

**Google / Facebook** (`lib/auth/oauth.ts`, `lib/auth/account.ts`)
- `GET /api/auth/<provider>/login?next=/path` → provider → `GET /api/auth/<provider>/callback`.
- A random `state` (and PKCE verifier for Google) is stored in a short-lived httpOnly cookie and checked on return. `next` must be a path on this site.
- `?link=1` (from Settings) attaches the provider to the signed-in account instead of signing in.
- **Google** verifies email ownership: new email → confirmed account; existing unconfirmed account → confirmed, and its password is **removed** (whoever set it never proved ownership).
- **Facebook** does not: new email → account stays unconfirmed; an email that already has an account is never taken over (`email_exists` error).
- Errors come back as `?auth_error=<code>` and are shown as toasts by `AuthProvider` (texts under `AuthErrors` in messages).

**Sign-out**: `POST /api/auth/logout`.

## Account settings (`lib/settings.ts`, `app/api/settings/*`)

Every sensitive change asks for the current password, or an email code when the account has none.

| Action | Route |
|---|---|
| Read settings | `GET /api/settings` |
| Change / set password (signs out other devices) | `POST /api/settings/password` |
| Turn 2FA on/off (needs a password on the account) | `POST /api/settings/two-factor` |
| Change email: send code to new address → confirm (old address notified) | `POST /api/settings/email` → `POST /api/settings/email/confirm` |
| Unlink Google/Facebook (refused if it's the last way in) | `DELETE /api/settings/social` |
| Notification switches | `PUT /api/settings/notifications` |
| Delete account (`{ password }` or `{ code }` from `/delete/code`) | `POST /api/settings/delete` |

Account deletion closes the account, removes personal data and deletes profile/cover photos from S3.
FangWriters (writer) accounts cannot be deleted from here.

## Profile images

`POST /api/auth/avatar` and `POST /api/auth/cover`: signed-in only, PNG/JPEG/WebP detected from bytes,
max 3 MB, stored in S3 under random names. Images are cropped/shrunk in the browser first
(`components/imagePicker.tsx`, `react-easy-crop`).
