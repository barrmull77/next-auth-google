# Next Auth Google Example

A local Next.js/NextAuth.js demo with PostgreSQL-backed registration, password
login and Google sign-in. **Do not deploy it or use real accounts.**

Code lives under `src/app`. `/api/me` returns the session's name and email;
`/api/users` stays disabled until an admin authorization policy exists.

### Technologies Used

- **Next.js**: application framework.
- **NextAuth.js**: password and Google authentication.
- **TypeScript**: static type checking.
- **Tailwind CSS**: styling.
- **bcryptjs**: password hashing.


## Local PostgreSQL foundation

Set `POSTGRES_DB`, `POSTGRES_USER` and `POSTGRES_PASSWORD` in an ignored
`.env.local`. These initialize the local database owner, not the runtime login.

```bash
docker compose --env-file .env.local -p next-auth-google up -d --wait
npm run db:setup-local
npm run db:apply-schema
npm run db:check
```

`db:setup-local` targets only `127.0.0.1:5435`. It creates `next_auth_runtime`
and saves `DATABASE_URL` (runtime) and `OWNER_DATABASE_URL` (owner), preserving
other settings. Rerunning rotates the runtime password; restart the app afterward.
Never use this command against shared or production databases.

`db:apply-schema` applies `db/schema.sql` in one transaction; failures roll back.
It is rerunnable, with no seeds, migration history or checksums. For older
password-only databases, the same command makes hashes nullable and adds
`app.accounts`, preserving users, hashes and IDs. Run `db:check` afterward.

### Tables and permissions

- **`app.users`**: generated UUID, nonblank name/email, optional nonblank password
  hash, and timezone-aware timestamps set at insertion. Email uniqueness ignores
  case; surrounding spaces are rejected. Updates must set `updated_at` explicitly.
- **`app.accounts`**: user ID, `google` provider and a nonblank, unpadded provider
  account ID. A foreign key requires an existing user; the composite primary key
  prevents a Google identity belonging to multiple users.
- **Runtime access**: insert name/email/hash and read ID/name/email/hash on users;
  insert/read all account columns. No user timestamp reads, updates or deletes;
  no account updates, deletes or truncation.

`src/lib/db.ts` provides a lazy, server-only pool using `DATABASE_URL`.
Only setup tooling uses the owner connection; request handlers cannot create tables.

### Password login and sessions

- Registration trims names, trims/lowercases emails and hashes passwords with
  bcrypt cost 12. Passwords require at least eight characters and at most 72 UTF-8 bytes.
- Duplicate emails return 409, revealing registration status. There is no login
  rate limiting.
- Login uses the same email normalization and one failure message for unknown
  users, wrong passwords and passwordless accounts.
- JWT sessions last up to 24 hours. `/api/me` reads the stored session identity,
  not a fresh database record.

### Google sign-in

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`. Authorize
`http://localhost:3000/api/auth/callback/google` in the Google OAuth client and
apply the database schema.

- Requires a verified email and nonblank name of up to 100 characters.
- Creates a passwordless user and association atomically; failures leave neither.
  Concurrent callbacks and retries resolve to one user.
- Returning users are identified by `(google, provider_account_id)`; stored names
  and emails are not updated from Google.
- Email collisions are rejected without linking or changing existing users.
  The login page directs users to their existing sign-in method.
- Both login methods use the application user ID. No Google access/refresh
  tokens are stored, exposed or refreshed.
- Older, unpersisted Google sessions require fresh sign-in; existing password
  sessions remain valid.

**Live verification required:** use an approved test Google account to check
first sign-in, logout, returning sign-in with the same application user ID,
and rejection when its email already belongs to a password account. Automated
tests do not replace this OAuth round trip.

### Schema maintenance and database tests

Edit `db/schema.sql` for local setup, granting only required runtime permissions.
`CREATE TABLE IF NOT EXISTS` does not upgrade existing tables: use explicit
SQL or rebuild only disposable databases. Introduce versioned migrations when
preserving data across environments becomes necessary.

Setup commands never reset the database or delete the Compose volume. Any
legacy `public.schema_migrations` table is unused and can remain.

`npm run test:db` checks upgrades, constraints, permissions, Google collisions,
concurrency, rollback and reruns. It creates and drops only a uniquely named
test database using the local owner connection. Ordinary `npm test` skips it
unless `OWNER_DATABASE_URL` is supplied.

Database scripts use Node's `--experimental-strip-types` flag (Node 22.12+).
It removes types without checking them; run `npx tsc --noEmit` for type-checking.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Use Node.js 24 LTS inside WSL and install dependencies with `npm ci`.
Configure `AUTH_SECRET` before starting; Google sign-in also requires `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET`.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Run the API handler and routing tests with `npm test`.

### Formatting

Prettier uses its default formatting rules. Format or check a specific file:

```bash
npm run format -- src/app/api/register/route.ts
npm run format:check -- src/app/api/register/route.ts
```

Use `.` instead of a file path for a project-wide check; some existing files
are unformatted. ESLint runs separately with `npm run lint`. In VS Code, select
the Prettier extension for Format Document or format on save.

After dependency upgrades, run `npm audit`, `npm run lint`, `npx tsc --noEmit`
and `npm run build`. NextAuth uses its v5 beta API. Remove the scoped minimatch
override when the lint parser adopts a patched compatible release.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to load the Inter font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
