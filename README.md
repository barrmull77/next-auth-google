# Next Auth Google Example

This is a simple demo project to familiarize myself with authentication flows in Next.js applications.
It implements simple registration, login, and social authentication (Google) using NextAuth.js.

The authentication demo lives under `src/app`. Its `/api/me` returns only the
authenticated session's name and email; `/api/users` is disabled until an
admin authorization policy is implemented. Registration and credential login
use PostgreSQL. Run locally only; do not deploy this demo or use it for real
accounts.

### Technologies Used

- **Next.js** provides a flexible, production-ready environment for building full-stack React apps.
- **NextAuth.js** simplifies authentication, supporting both credentials and OAuth providers with minimal setup.
- **TypeScript** helps catch errors early and improves code quality.
- **Tailwind CSS** enables fast, responsive UI development.
- **bcryptjs** is a widely used library for securely hashing passwords.

## Next Steps

Registration and credential login use PostgreSQL. Google account linking remains
a separate increment.

## Local PostgreSQL foundation

Use the repository's `compose.yaml` with an ignored `.env.local` containing
`POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD`. The initialization user
is the local database owner, not the application's runtime login.

```bash
docker compose --env-file .env.local -p next-auth-google up -d --wait
npm run db:setup-local
npm run db:apply-schema
npm run db:check
```

`db:setup-local` targets only `127.0.0.1:5435`. It creates a separate
`next_auth_runtime` login and saves `DATABASE_URL` (runtime) and
`OWNER_DATABASE_URL` (owner) in `.env.local`, preserving other settings.
Rerunning rotates the runtime password; restart the app afterward. Never use
this local setup command against shared or production databases.

`db:apply-schema` runs `db/schema.sql` in one transaction, without migration
history or checksums. It creates the `app` schema and `app.users` table; it is
safe to rerun and does not seed accounts. A SQL failure rolls back that invocation.

`app.users` has a generated UUID ID, required nonblank name, email and password
hash, and timezone-aware `created_at`/`updated_at` timestamps defaulting to the
insertion time. Email uniqueness ignores case; surrounding spaces are rejected.
Future update queries must set `updated_at` explicitly. The table currently
supports password accounts only; Google account linking remains separate.
The runtime login may insert the name, email and password hash columns, and
select the ID, name, email and password hash for authentication. It cannot
read timestamps or update or delete users.

Registration trims names, trims and lowercases email, rejects duplicates
case-insensitively, and stores bcrypt hashes with cost 12. Passwords must have
at least eight characters and at most 72 UTF-8 bytes. The local demo returns
409 for duplicate emails, which reveals whether an email is registered; it
must not be deployed for real accounts.
Credential login normalizes email the same way, checks the bcrypt hash, and
reports the same message for an unknown account or incorrect password.
There is no login rate limiting, and Google sign-in is not linked to these
password accounts. Existing JWT sessions remain valid until logout or expiry
(up to 24 hours); `/api/me` reports the identity stored in that session rather
than reloading the account.

Edit this single setup file during local development. Future table definitions
must grant only required table privileges to the runtime login. Editing a
`CREATE TABLE IF NOT EXISTS` statement will not alter an existing table:
existing databases need explicit SQL changes, or an intentional rebuild if all
their data is disposable. Use versioned migrations when preserving data across
environments becomes necessary.

`src/lib/db.ts` provides a lazy, server-only connection pool using `DATABASE_URL`.
Registration and credential login use this pool. The runtime cannot create tables;
the owner connection is used only by setup tooling, never request handlers.
These commands do not reset the database or delete the Compose volume. If you
ran the earlier migration runner, its unused `public.schema_migrations` table
can remain; this setup neither reads nor updates it.

Run `npm run test:db` explicitly to exercise schema setup, user constraints,
reruns, rollback, and the server pool against a temporary database on the
local PostgreSQL instance. It creates and drops only its own uniquely named
test database using the local owner connection. Ordinary `npm test` skips this
test unless `OWNER_DATABASE_URL` is explicitly supplied.

The database commands run TypeScript `.mts` scripts using Node's type stripping
(`--experimental-strip-types`), with no separate script runner. The flag supports
the project's Node 22.12 minimum; older Node releases may show an experimental
warning. Run `npx tsc --noEmit` to type-check them; Node strips types but does
not check them at runtime.

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

Replace the file path with `.` to format or check the whole project. Existing
files have not been reformatted, so a project-wide check may report differences.
`npm run lint` remains a separate ESLint check. In VS Code, install the Prettier
extension and select it as the formatter to use Format Document or format on save.

Dependency checks: run `npm audit`, `npm run lint`, `npx tsc --noEmit`, and
`npm run build` after upgrades. NextAuth remains on its v5 beta API.
The scoped minimatch override patches the lint parser's dependency while
its upstream release still requires the affected 10.x series; remove it
when the parser adopts a patched compatible release.

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
