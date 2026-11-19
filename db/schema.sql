CREATE SCHEMA IF NOT EXISTS app;
GRANT USAGE ON SCHEMA app TO next_auth_runtime;

CREATE TABLE IF NOT EXISTS app.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (btrim(name) <> ''),
  email text NOT NULL CHECK (btrim(email) <> '' AND email = btrim(email)),
  password_hash text CHECK (btrim(password_hash) <> ''),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON app.users (lower(email));

-- Upgrade existing password-only databases without rebuilding users.
ALTER TABLE app.users ALTER COLUMN password_hash DROP NOT NULL;

CREATE TABLE IF NOT EXISTS app.accounts (
  user_id uuid NOT NULL REFERENCES app.users (id),
  provider text NOT NULL CHECK (provider = 'google'),
  provider_account_id text NOT NULL
    CHECK (btrim(provider_account_id) <> '' AND provider_account_id = btrim(provider_account_id)),
  PRIMARY KEY (provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS accounts_user_id_index ON app.accounts (user_id);

GRANT INSERT (name, email, password_hash) ON app.users TO next_auth_runtime;
GRANT SELECT (id, name, email, password_hash) ON app.users TO next_auth_runtime;
GRANT INSERT (user_id, provider, provider_account_id) ON app.accounts TO next_auth_runtime;
GRANT SELECT (user_id, provider, provider_account_id) ON app.accounts TO next_auth_runtime;
