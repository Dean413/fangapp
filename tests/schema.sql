-- Trimmed schema for local integration tests.
-- Covers exactly the tables/types/functions touched by lib/unlock.ts, lib/payments/credit.ts,
-- lib/payments/subscription.ts, lib/reward.ts and their helpers (lib/wallet.ts, lib/vip.ts).
-- Extracted by hand from production_schema_current.sql — keep in sync if that dump changes.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

CREATE TYPE contract_plan AS ENUM (
    'exclusive',
    'non-exclusive',
    'mab-exclusive',
    'custom'
);

CREATE TYPE contract_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'signing-pending',
    'terminated',
    'signed',
    'not-signed'
);

CREATE TYPE id_document_type AS ENUM (
    'National ID',
    'Passport',
    'Voters card'
);

CREATE TYPE id_validity_type AS ENUM (
    'Long-Term Valid',
    'Has Expiration Date'
);

CREATE FUNCTION new_tx_code() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    c text;
BEGIN
    LOOP
        c := 'TXN' || lpad(floor(random() * 1e14)::bigint::text, 14, '0');
        EXIT WHEN NOT EXISTS (SELECT 1 FROM wallet_ledger WHERE tx_code = c)
              AND NOT EXISTS (SELECT 1 FROM wallet_lots WHERE expiry_code = c)
              AND NOT EXISTS (SELECT 1 FROM payments WHERE tx_code = c);
    END LOOP;
    RETURN c;
END
$$;

CREATE TABLE users (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    email text NOT NULL,
    password_hash text,
    created_at timestamp with time zone DEFAULT now(),
    announcements_seen_at timestamp with time zone,
    last_active_at timestamp with time zone,
    account_status text DEFAULT 'active'::text NOT NULL,
    role text DEFAULT 'reader'::text NOT NULL,
    suspended_until timestamp with time zone,
    email_verified_at timestamp with time zone,
    sessions_valid_after timestamp with time zone,
    two_factor_enabled boolean DEFAULT false NOT NULL,
    password_changed_at timestamp with time zone,
    timezone text,
    timezone_changed_at timestamp with time zone,
    CONSTRAINT users_account_status_check CHECK ((account_status = ANY (ARRAY['active'::text, 'suspended'::text, 'banned'::text, 'deleted'::text])))
);

CREATE TABLE stories (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL,
    title text NOT NULL,
    start_paywall_chapter integer,
    original_story_id uuid,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT stories_not_own_original CHECK (((original_story_id IS NULL) OR (original_story_id <> id)))
);

CREATE TABLE chapters (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    story_id uuid NOT NULL REFERENCES stories(id),
    title text NOT NULL,
    content text DEFAULT ''::text,
    status text DEFAULT 'draft'::text NOT NULL,
    words integer DEFAULT 0 NOT NULL,
    scheduled_for timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    note text,
    published_at timestamp with time zone,
    chapter_number integer
);

CREATE TABLE contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    story_id uuid,
    user_id uuid NOT NULL,
    plan_id contract_plan NOT NULL,
    status contract_status DEFAULT 'pending'::contract_status,
    locale text DEFAULT 'en'::text NOT NULL,
    content jsonb,
    start_paywall_chapter numeric NOT NULL,
    outline text NOT NULL,
    interesting text NOT NULL,
    main_characters text NOT NULL,
    under_contract_elsewhere boolean DEFAULT false NOT NULL,
    platform_link text,
    platform_dashboard_url text,
    city text NOT NULL,
    legal_name text NOT NULL,
    pen_name text NOT NULL,
    email text NOT NULL,
    gender text NOT NULL,
    dob date NOT NULL,
    nationality text NOT NULL,
    phone_country text NOT NULL,
    phone_number text NOT NULL,
    id_number text NOT NULL,
    id_validity id_validity_type NOT NULL,
    id_type id_document_type NOT NULL,
    id_document_front_url text NOT NULL,
    id_document_back_url text,
    e_signature_url text NOT NULL,
    agreed_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    comic_id uuid,
    CONSTRAINT contracts_exactly_one_target CHECK ((((story_id IS NOT NULL) AND (comic_id IS NULL)) OR ((story_id IS NULL) AND (comic_id IS NOT NULL))))
);

CREATE TABLE chapter_unlocks (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    story_id uuid NOT NULL,
    coins integer NOT NULL,
    method text DEFAULT 'coins'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chapter_unlocks_pkey PRIMARY KEY (user_id, chapter_id),
    CONSTRAINT chapter_unlocks_coins_check CHECK ((coins >= 0)),
    CONSTRAINT chapter_unlocks_method_check CHECK ((method = ANY (ARRAY['coins'::text, 'vip'::text, 'free'::text])))
);
CREATE INDEX chapter_unlocks_story_idx ON chapter_unlocks USING btree (user_id, story_id);
CREATE INDEX chapter_unlocks_vip_idx ON chapter_unlocks USING btree (user_id, created_at) WHERE (method = 'vip'::text);

CREATE TABLE reader_auto_unlock (
    user_id uuid NOT NULL,
    story_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reader_auto_unlock_pkey PRIMARY KEY (user_id, story_id)
);

CREATE TABLE wallet_lots (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL,
    currency text NOT NULL,
    kind text NOT NULL,
    amount integer NOT NULL,
    remaining integer NOT NULL,
    net_value_per_coin numeric(20,10),
    purchase_id text,
    source text NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expiry_code text DEFAULT new_tx_code() NOT NULL,
    CONSTRAINT wallet_lots_amount_check CHECK ((amount > 0)),
    CONSTRAINT wallet_lots_check CHECK (((remaining >= 0) AND (remaining <= amount))),
    CONSTRAINT wallet_lots_currency_check CHECK ((currency = ANY (ARRAY['coin'::text, 'gem'::text]))),
    CONSTRAINT wallet_lots_gems_are_earned CHECK (((currency = 'coin'::text) OR (kind = 'earned'::text))),
    CONSTRAINT wallet_lots_kind_check CHECK ((kind = ANY (ARRAY['base'::text, 'bonus'::text, 'vip_bonus'::text, 'earned'::text]))),
    CONSTRAINT wallet_lots_value_only_for_base CHECK (((kind = 'base'::text) = (net_value_per_coin IS NOT NULL)))
);
CREATE UNIQUE INDEX wallet_lots_expiry_code_key ON wallet_lots USING btree (expiry_code);
CREATE UNIQUE INDEX wallet_lots_one_per_purchase ON wallet_lots USING btree (purchase_id, kind) WHERE (purchase_id IS NOT NULL);
CREATE UNIQUE INDEX wallet_lots_one_signup_bonus ON wallet_lots USING btree (user_id) WHERE (source = 'signup_bonus'::text);
CREATE INDEX wallet_lots_spendable_idx ON wallet_lots USING btree (user_id, currency, expires_at) WHERE (remaining > 0);

CREATE TABLE wallet_ledger (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL,
    lot_id bigint,
    currency text NOT NULL,
    kind text NOT NULL,
    delta integer NOT NULL,
    reason text NOT NULL,
    ref_type text,
    ref_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tx_code text DEFAULT new_tx_code() NOT NULL,
    CONSTRAINT wallet_ledger_currency_check CHECK ((currency = ANY (ARRAY['coin'::text, 'gem'::text]))),
    CONSTRAINT wallet_ledger_delta_check CHECK ((delta <> 0)),
    CONSTRAINT wallet_ledger_kind_check CHECK ((kind = ANY (ARRAY['base'::text, 'bonus'::text, 'vip_bonus'::text, 'earned'::text])))
);

CREATE TABLE coin_spends (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ledger_id bigint NOT NULL,
    lot_id bigint NOT NULL,
    user_id uuid NOT NULL,
    coin_kind text NOT NULL,
    purchase_id text,
    coins integer NOT NULL,
    value_per_coin numeric(20,10) DEFAULT 0 NOT NULL,
    net_revenue numeric(20,10) DEFAULT 0 NOT NULL,
    story_id uuid NOT NULL,
    chapter_id uuid NOT NULL,
    creator_id uuid,
    contract_id text,
    contract_type text,
    contractual_rate numeric(6,4),
    payout_factor numeric(6,4),
    creator_earnings numeric(20,10),
    settlement_status text DEFAULT 'pending'::text NOT NULL,
    settled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT coin_spends_coin_kind_check CHECK ((coin_kind = ANY (ARRAY['base'::text, 'bonus'::text, 'vip_bonus'::text]))),
    CONSTRAINT coin_spends_coins_check CHECK ((coins > 0)),
    CONSTRAINT coin_spends_settlement_status_check CHECK ((settlement_status = ANY (ARRAY['pending'::text, 'settled'::text, 'not_eligible'::text, 'refunded'::text])))
);

CREATE TABLE payments (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL,
    provider text NOT NULL,
    provider_ref text,
    provider_txn text,
    price_cents integer NOT NULL,
    base_coins integer NOT NULL,
    bonus_coins integer DEFAULT 0 NOT NULL,
    vip_bonus_coins integer DEFAULT 0 NOT NULL,
    vip_plan text,
    gems integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    paid_at timestamp with time zone,
    currency text DEFAULT 'USD'::text NOT NULL,
    refunded_at timestamp with time zone,
    refund_cents integer,
    product text DEFAULT 'coins'::text NOT NULL,
    tx_code text DEFAULT new_tx_code(),
    CONSTRAINT payments_base_coins_check CHECK ((base_coins >= 0)),
    CONSTRAINT payments_bonus_coins_check CHECK ((bonus_coins >= 0)),
    CONSTRAINT payments_gems_check CHECK ((gems >= 0)),
    CONSTRAINT payments_price_cents_check CHECK ((price_cents > 0)),
    CONSTRAINT payments_product_check CHECK ((product = ANY (ARRAY['coins'::text, 'vip'::text]))),
    CONSTRAINT payments_provider_check CHECK ((provider = ANY (ARRAY['stripe'::text, 'paypal'::text]))),
    CONSTRAINT payments_refund_cents_check CHECK (((refund_cents IS NULL) OR (refund_cents >= 0))),
    CONSTRAINT payments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'refunded'::text]))),
    CONSTRAINT payments_vip_bonus_coins_check CHECK ((vip_bonus_coins >= 0))
);
CREATE UNIQUE INDEX payments_provider_txn_key ON payments USING btree (provider, provider_txn) WHERE (provider_txn IS NOT NULL);

CREATE TABLE vip_subscriptions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL,
    plan text NOT NULL,
    starts_at timestamp with time zone DEFAULT now() NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    source text DEFAULT 'admin'::text NOT NULL,
    external_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vip_subscriptions_check CHECK ((ends_at > starts_at)),
    CONSTRAINT vip_subscriptions_plan_check CHECK ((plan = ANY (ARRAY['weekly'::text, 'monthly'::text]))),
    CONSTRAINT vip_subscriptions_source_check CHECK ((source = ANY (ARRAY['stripe'::text, 'paypal'::text, 'admin'::text])))
);

CREATE TABLE vip_billing (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL,
    provider text NOT NULL,
    plan text NOT NULL,
    provider_ref text,
    provider_subscription_id text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    activated_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    CONSTRAINT vip_billing_plan_check CHECK ((plan = ANY (ARRAY['weekly'::text, 'monthly'::text]))),
    CONSTRAINT vip_billing_provider_check CHECK ((provider = ANY (ARRAY['stripe'::text, 'paypal'::text]))),
    CONSTRAINT vip_billing_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'cancelled'::text, 'ended'::text])))
);

CREATE TABLE vip_daily_bonus (
    user_id uuid NOT NULL,
    subscription_id bigint NOT NULL,
    day date NOT NULL,
    coins integer NOT NULL,
    lot_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vip_daily_bonus_pkey PRIMARY KEY (user_id, day),
    CONSTRAINT vip_daily_bonus_coins_check CHECK ((coins > 0))
);

CREATE TABLE daily_checkins (
    user_id uuid NOT NULL PRIMARY KEY,
    streak_day integer NOT NULL,
    last_claim_at timestamp with time zone NOT NULL,
    CONSTRAINT daily_checkins_streak_day_check CHECK (((streak_day >= 1) AND (streak_day <= 7)))
);
