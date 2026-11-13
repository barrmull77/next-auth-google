CREATE SCHEMA IF NOT EXISTS app;
GRANT USAGE ON SCHEMA app TO next_auth_runtime;

CREATE TABLE IF NOT EXISTS app.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (btrim(name) <> ''),
  email text NOT NULL CHECK (btrim(email) <> '' AND email = btrim(email)),
  password_hash text NOT NULL CHECK (btrim(password_hash) <> ''),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON app.users (lower(email));
