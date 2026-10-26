# Database

One PostgreSQL database is shared with FangWriters. Access is raw SQL through `lib/db.ts`.

`production_schema_current.sql` is a schema-only dump of the production database: the FangWriters
tables, the reader tables below, and the Supabase `auth` / `storage` / `realtime` schemas. There are no
migrations in this repo, so this dump is the reference for the schema. Re-dump it after schema changes.

## Owned by FangWriters (read here)

| Table | Used for |
|---|---|
| `users` | Accounts. This app also writes `password_hash`, `account_status`, `timezone`, `timezone_changed_at`, `last_active_at`, `sessions_valid_after`, email confirmation |
| `user_profiles` | Full name, pen name (author pages), profile image, public id |
| `stories`, `chapters`, `comics`, `comic_episodes` | Catalogue and chapter text; `stories.views` is incremented here; `stories.tenants` for tenant filtering |
| `contracts` | `start_paywall_chapter` of the latest signed contract = first paid chapter |
| `comments` | Chapter comments (reader comments use platform `'Fang'`) |
| `metadata_categories`, `metadata_options`, `metadata_option_translations` | Genres, tags, rank types and their translations |
| `curation_collections`, `curation_items` | Home rows and ranking lists |
| `story_recommendations`, `book_slug_history` | Recommendations, old slugs |

## Reader tables (written here)

| Area | Tables |
|---|---|
| Auth | `email_codes`, `login_attempts`, `user_identities` (Google/Facebook links), `email_change_requests`, `sessions` |
| Profile | `reader_profiles`, `reader_favorite_genres`, `reader_settings` |
| Wallet | `wallet_lots`, `wallet_ledger` (append-only), `coin_spends` (per-lot revenue for writer earnings) |
| Payments / VIP | `payments`, `vip_billing`, `vip_subscriptions`, `vip_daily_bonus` |
| Unlocks | `chapter_unlocks` (unique per user+chapter; `method` `coins` / `vip`), `reader_auto_unlock` |
| Rewards | `daily_checkins`, `reading_time`, `reading_reward_claims`, `reading_gem_claims`, `reading_daily` |
| Library | `reader_library`, `reading_progress`, `story_views` |
| Community | `book_reviews`, `review_likes`, `review_replies`, `review_prompts`, `comment_likes`, `author_follows` |
| Reports | `content_reports`, `book_reports`, `book_report_files` |
| Notifications | `reader_notifications`, `reader_notification_state` |

## Constraints the code relies on

These unique constraints make the idempotent writes work. All are in the dump; keep them if you change the schema:

| Constraint | Protects |
|---|---|
| `wallet_lots_one_signup_bonus` — unique `(user_id) WHERE source = 'signup_bonus'` | Sign-up bonus once per account |
| `chapter_unlocks_pkey (user_id, chapter_id)` | A chapter is never charged twice |
| `payments_provider_txn_key (provider, provider_txn) WHERE provider_txn IS NOT NULL` | A provider charge is credited once |
| `payments_provider_ref_key (provider, provider_ref) WHERE provider_ref IS NOT NULL` | One payment row per checkout session/order |
| `vip_daily_bonus_pkey (user_id, day)` | VIP daily coins once per day |
| `daily_checkins_pkey (user_id)`, `reading_time_pkey (user_id)` | One check-in / reading-time row per reader |
| `reading_reward_claims_pkey (user_id, period_start, minutes)` | Each milestone once per period |
| `reading_gem_claims_pkey (user_id, period_start)` | Reading gem once per period |
| `reader_auto_unlock_pkey (user_id, story_id)` | Auto-unlock switch per book |
| `reader_notifications_user_id_kind_ref_key (user_id, kind, ref)` | Re-syncing notifications never duplicates |

Other tables in the dump not used by this app: `account_actions`, `chapters_title_backup`,
`chapters_title_backup_phase` (writer/admin side or one-off backups), plus FangWriters-only tables such as
`income_transactions`, `withdrawal_requests`, `tax_info`, `payment_info`.
