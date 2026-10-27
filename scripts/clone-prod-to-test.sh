#!/usr/bin/env bash
# Clones the public schema of the live production DB into the local TEST_DATABASE_URL,
# then scrubs PII/secrets so no real emails, password hashes, tokens, or financial
# details end up sitting in a local test database.
#
# Source: DATABASE_URL in .env.production (the live RDS instance)
# Target: TEST_DATABASE_URL in .env.local (your local Postgres)
#
# Usage: bash scripts/clone-prod-to-test.sh
set -euo pipefail
cd "$(dirname "$0")/.."

PROD_DB=$(grep -E '^DATABASE_URL=' .env.production | cut -d= -f2-)
TEST_DB=$(grep -E '^TEST_DATABASE_URL=' .env.local | cut -d= -f2-)

if [[ -z "$PROD_DB" || -z "$TEST_DB" ]]; then
    echo "Missing DATABASE_URL (.env.production) or TEST_DATABASE_URL (.env.local)" >&2
    exit 1
fi

echo "==> Dumping public schema from production..."
DUMP_FILE=$(mktemp)
trap 'rm -f "$DUMP_FILE"' EXIT
pg_dump "$PROD_DB" \
    --schema=public \
    --no-owner \
    --no-privileges \
    --file="$DUMP_FILE"

echo "==> Wiping test database's public schema (it may have a different structure, e.g. from tests/schema.sql)..."
psql "$TEST_DB" -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE;"

echo "==> Restoring into test database..."
psql "$TEST_DB" -v ON_ERROR_STOP=1 -f "$DUMP_FILE" >/dev/null

echo "==> Scrubbing PII and secrets in the test database..."
psql "$TEST_DB" -v ON_ERROR_STOP=1 <<'SQL'
-- Replace real emails/password hashes with deterministic fake values, keep the
-- row's id so foreign keys and local testing flows (e.g. "log in as user X") still work.
UPDATE users SET
    email = 'user-' || id || '@test.local',
    password_hash = NULL;

UPDATE user_profiles SET
    email = 'user-' || user_id || '@test.local',
    full_name = 'Test User',
    pen_name = CASE WHEN pen_name = '' THEN '' ELSE 'Test Pen Name' END,
    id_number = '',
    phone_number = '',
    id_document_front = NULL,
    id_document_back = NULL,
    e_signature = NULL,
    profile_image = NULL;

UPDATE user_identities SET
    email = 'user-' || user_id || '@test.local',
    provider_user_id = 'test-' || provider_user_id;

UPDATE login_attempts SET email = 'scrubbed-' || md5(email) || '@test.local';

UPDATE email_change_requests SET new_email = 'user-' || user_id || '@test.local';

UPDATE email_codes SET code_hash = 'scrubbed', prev_code_hash = NULL;

UPDATE sessions SET token = 'scrubbed-' || id;

UPDATE payment_info SET
    payee_name = 'Test Payee',
    payoneer_account_email = NULL,
    account_holder_name = 'Test Holder',
    bank_account_number = NULL,
    bank_name = NULL,
    swift_code = NULL,
    routing_number = NULL,
    iban = NULL,
    address = NULL,
    sort_code = NULL,
    paypal_account_email = NULL,
    paypal_account_name = NULL;

UPDATE tax_info SET document_url = 'scrubbed';
SQL

echo "==> Done. Test database now mirrors production structure and volume with scrubbed PII."
