import { randomUUID } from "node:crypto";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";
import bcrypt from "bcryptjs";
import { expect, it, vi } from "vitest";
import { applySchema } from "../scripts/apply-schema.mts";

vi.mock("server-only", () => ({}));
import { getDatabasePool } from "@/lib/db";
import { POST as register } from "@/app/api/register/route";
import { authenticateCredentials } from "@/lib/credentials";
import { resolveGoogleUser } from "@/lib/google";

it.skipIf(!process.env.OWNER_DATABASE_URL)(
  "applies the schema safely on rerun and connects through a restricted runtime pool",
  async () => {
    const ownerUrl = new URL(process.env.OWNER_DATABASE_URL!);
    if (
      !["127.0.0.1", "localhost"].includes(ownerUrl.hostname) ||
      ownerUrl.port !== "5435"
    ) {
      throw new Error(
        "Integration tests require the local Compose database on port 5435",
      );
    }
    if (!process.env.DATABASE_URL)
      throw new Error("DATABASE_URL must be configured");

    const databaseName = `next_auth_test_${randomUUID().replaceAll("-", "")}`;
    const owner = new pg.Client({ connectionString: ownerUrl.toString() });
    const directory = await mkdtemp(join(tmpdir(), "next-auth-schema-"));
    const runtimeUrl = new URL(process.env.DATABASE_URL);
    runtimeUrl.pathname = `/${databaseName}`;
    await owner.connect();
    let created = false;
    let pool: pg.Pool | undefined;
    let schemaClient: pg.Client | undefined;
    try {
      await owner.query(`CREATE DATABASE ${pg.escapeIdentifier(databaseName)}`);
      created = true;
      ownerUrl.pathname = `/${databaseName}`;
      await applySchema(ownerUrl.toString());

      schemaClient = new pg.Client({ connectionString: ownerUrl.toString() });
      await schemaClient.connect();
      const passwordHash = await bcrypt.hash("synthetic-test-password", 5);
      const inserted = await schemaClient.query<{ id: string }>(
        "INSERT INTO app.users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, password_hash, created_at, updated_at",
        ["Test User", "test@example.invalid", passwordHash],
      );
      expect(inserted.rows).toEqual([
        {
          id: expect.stringMatching(
            /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/,
          ),
          name: "Test User",
          email: "test@example.invalid",
          password_hash: passwordHash,
          created_at: expect.any(Date),
          updated_at: expect.any(Date),
        },
      ]);
      // Recreate the old schema contract to verify a data-preserving upgrade.
      await schemaClient.query(
        "DROP TABLE app.accounts; ALTER TABLE app.users ALTER COLUMN password_hash SET NOT NULL",
      );
      await applySchema(ownerUrl.toString());
      await applySchema(ownerUrl.toString());
      expect(
        (
          await schemaClient.query(
            "SELECT id, name, email, password_hash, created_at, updated_at FROM app.users",
          )
        ).rows,
      ).toEqual(inserted.rows);
      await expect(
        schemaClient.query(
          "INSERT INTO app.users (name, email, password_hash) VALUES ($1, $2, $3)",
          ["Duplicate", "TEST@example.invalid", passwordHash],
        ),
      ).rejects.toMatchObject({ code: "23505" });
      for (const [name, email, hash, code] of [
        ["", "other@example.invalid", passwordHash, "23514"],
        ["Test", "", passwordHash, "23514"],
        ["Test", " spaced@example.invalid ", passwordHash, "23514"],
        ["Test", "other@example.invalid", "", "23514"],
      ]) {
        await expect(
          schemaClient.query(
            "INSERT INTO app.users (name, email, password_hash) VALUES ($1, $2, $3)",
            [name, email, hash],
          ),
        ).rejects.toMatchObject({ code });
      }
      const googleUser = await schemaClient.query<{
        id: string;
        password_hash: string | null;
      }>(
        "INSERT INTO app.users (name, email) VALUES ($1, $2) RETURNING id, password_hash",
        ["Google User", "google@example.invalid"],
      );
      expect(googleUser.rows[0].password_hash).toBeNull();
      await schemaClient.query(
        "INSERT INTO app.users (name, email, password_hash) VALUES ($1, $2, $3)",
        ["No Password", "null-password@example.invalid", null],
      );
      await applySchema(ownerUrl.toString());
      expect(
        (
          await schemaClient.query(
            "SELECT count(*)::integer AS count FROM app.users",
          )
        ).rows,
      ).toEqual([{ count: 3 }]);

      vi.stubEnv("DATABASE_URL", runtimeUrl.toString());
      pool = getDatabasePool();
      expect((await pool.query("SELECT current_user AS role")).rows).toEqual([
        { role: "next_auth_runtime" },
      ]);
      await expect(
        pool.query("CREATE TABLE app.forbidden (id integer)"),
      ).rejects.toMatchObject({ code: "42501" });
      await expect(
        pool.query("SELECT created_at FROM app.users"),
      ).rejects.toMatchObject({ code: "42501" });
      const googleUserId = googleUser.rows[0].id;
      await pool.query(
        "INSERT INTO app.accounts (user_id, provider, provider_account_id) VALUES ($1, $2, $3)",
        [googleUserId, "google", "synthetic-google-id"],
      );
      expect(
        (
          await pool.query(
            "SELECT user_id, provider, provider_account_id FROM app.accounts",
          )
        ).rows,
      ).toEqual([
        {
          user_id: googleUserId,
          provider: "google",
          provider_account_id: "synthetic-google-id",
        },
      ]);
      for (const userId of [googleUserId, inserted.rows[0].id]) {
        await expect(
          pool.query(
            "INSERT INTO app.accounts (user_id, provider, provider_account_id) VALUES ($1, $2, $3)",
            [userId, "google", "synthetic-google-id"],
          ),
        ).rejects.toMatchObject({ code: "23505" });
      }
      for (const [userId, provider, accountId, code] of [
        [randomUUID(), "google", "missing-user", "23503"],
        [null, "google", "null-user", "23502"],
        [googleUserId, null, "null-provider", "23502"],
        [googleUserId, "unsupported", "other-provider", "23514"],
        [googleUserId, "google", null, "23502"],
        [googleUserId, "google", "", "23514"],
        [googleUserId, "google", " spaced ", "23514"],
      ]) {
        await expect(
          pool.query(
            "INSERT INTO app.accounts (user_id, provider, provider_account_id) VALUES ($1, $2, $3)",
            [userId, provider, accountId],
          ),
        ).rejects.toMatchObject({ code });
      }
      await expect(
        pool.query("UPDATE app.accounts SET user_id = $1", [
          inserted.rows[0].id,
        ]),
      ).rejects.toMatchObject({ code: "42501" });
      await expect(
        pool.query("DELETE FROM app.accounts"),
      ).rejects.toMatchObject({
        code: "42501",
      });
      await expect(pool.query("TRUNCATE app.accounts")).rejects.toMatchObject({
        code: "42501",
      });
      await applySchema(ownerUrl.toString());
      expect(
        (
          await pool.query(
            "SELECT user_id FROM app.accounts WHERE provider = $1 AND provider_account_id = $2",
            ["google", "synthetic-google-id"],
          )
        ).rows,
      ).toEqual([{ user_id: googleUserId }]);
      const request = (email: string) =>
        new Request("http://localhost/api/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: "  Registered User  ",
            email,
            password: "example-password",
          }),
        });
      expect((await register(request(" NEW@example.invalid "))).status).toBe(
        201,
      );
      expect((await register(request("new@EXAMPLE.invalid"))).status).toBe(409);
      const persisted = await schemaClient.query<{
        name: string;
        email: string;
        password_hash: string;
      }>("SELECT name, email, password_hash FROM app.users WHERE email = $1", [
        "new@example.invalid",
      ]);
      expect(persisted.rows).toHaveLength(1);
      expect(persisted.rows[0].name).toBe("Registered User");
      expect(persisted.rows[0].password_hash).not.toBe("example-password");
      expect(
        await bcrypt.compare(
          "example-password",
          persisted.rows[0].password_hash,
        ),
      ).toBe(true);
      expect(bcrypt.getRounds(persisted.rows[0].password_hash)).toBe(12);
      const authenticated = await authenticateCredentials({
        email: "  NEW@EXAMPLE.INVALID ",
        password: "example-password",
      });
      expect(authenticated).toEqual({
        id: expect.any(String),
        name: "Registered User",
        email: "new@example.invalid",
      });
      expect(
        await authenticateCredentials({
          email: "new@example.invalid",
          password: "wrong-password",
        }),
      ).toBeNull();
      expect(
        await authenticateCredentials({
          email: "unknown@example.invalid",
          password: "example-password",
        }),
      ).toBeNull();
      expect(
        await authenticateCredentials({
          email: "google@example.invalid",
          password: "example-password",
        }),
      ).toBeNull();
      const concurrent = await Promise.all([
        register(request("race@example.invalid")),
        register(request("RACE@example.invalid")),
      ]);
      expect(concurrent.map((response) => response.status).sort()).toEqual([
        201, 409,
      ]);
      expect(
        (
          await schemaClient.query(
            "SELECT count(*)::integer AS count FROM app.users WHERE lower(email) = $1",
            ["race@example.invalid"],
          )
        ).rows,
      ).toEqual([{ count: 1 }]);
      const profile = {
        sub: "persisted-google-id",
        name: "  Persisted Google User  ",
        email: "  PERSISTED@EXAMPLE.INVALID ",
        email_verified: true,
      };
      const googleSignIn = await resolveGoogleUser(profile, profile.sub);
      expect(googleSignIn).toEqual({
        user: {
          id: expect.any(String),
          name: "Persisted Google User",
          email: "persisted@example.invalid",
        },
      });
      if (!("user" in googleSignIn)) throw new Error("Google sign-in failed");
      expect(
        (
          await schemaClient.query(
            "SELECT password_hash FROM app.users WHERE id = $1",
            [googleSignIn.user.id],
          )
        ).rows,
      ).toEqual([{ password_hash: null }]);
      expect(
        await resolveGoogleUser(
          { ...profile, name: "Changed Name", email: "new@example.invalid" },
          profile.sub,
        ),
      ).toEqual(googleSignIn);
      expect(
        await resolveGoogleUser(
          {
            ...profile,
            sub: "password-conflict",
            email: " NEW@EXAMPLE.INVALID ",
          },
          "password-conflict",
        ),
      ).toEqual({ error: "GoogleAccountConflict" });
      expect(
        await resolveGoogleUser(
          { ...profile, sub: "google-conflict" },
          "google-conflict",
        ),
      ).toEqual({ error: "GoogleAccountConflict" });
      expect(
        (
          await pool.query(
            "SELECT user_id FROM app.accounts WHERE provider_account_id = ANY($1)",
            [["password-conflict", "google-conflict"]],
          )
        ).rows,
      ).toEqual([]);
      for (const differentEmails of [false, true]) {
        const sub = `concurrent-google-${differentEmails}`;
        const firstEmail = `first-${differentEmails}@example.invalid`;
        const secondEmail = differentEmails
          ? "second@example.invalid"
          : firstEmail;
        const results = await Promise.all([
          resolveGoogleUser({ ...profile, sub, email: firstEmail }, sub),
          resolveGoogleUser({ ...profile, sub, email: secondEmail }, sub),
        ]);
        expect(results[0]).toHaveProperty("user");
        expect(results[1]).toEqual(results[0]);
        expect(
          (
            await pool.query("SELECT id FROM app.users WHERE email = ANY($1)", [
              [firstEmail, secondEmail],
            ])
          ).rows,
        ).toHaveLength(1);
        expect(
          (
            await pool.query(
              "SELECT user_id FROM app.accounts WHERE provider_account_id = $1",
              [sub],
            )
          ).rows,
        ).toHaveLength(1);
      }
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      await schemaClient.query(
        "REVOKE INSERT (user_id, provider, provider_account_id) ON app.accounts FROM next_auth_runtime",
      );
      try {
        await expect(
          resolveGoogleUser(
            {
              ...profile,
              sub: "failed-association",
              email: "rollback@example.invalid",
            },
            "failed-association",
          ),
        ).rejects.toThrow("Google sign-in persistence failed");
        expect(
          (
            await pool.query("SELECT id FROM app.users WHERE email = $1", [
              "rollback@example.invalid",
            ])
          ).rows,
        ).toEqual([]);
        expect(log).toHaveBeenCalledWith("Google sign-in persistence failed");
      } finally {
        await schemaClient.query(
          "GRANT INSERT (user_id, provider, provider_account_id) ON app.accounts TO next_auth_runtime",
        );
        log.mockRestore();
      }
      await expect(
        pool.query("UPDATE app.users SET name = $1", ["Forbidden"]),
      ).rejects.toMatchObject({ code: "42501" });
      await expect(pool.query("DELETE FROM app.users")).rejects.toMatchObject({
        code: "42501",
      });
      await expect(
        pool.query(
          "INSERT INTO app.users (id, name, email, password_hash) VALUES ($1, $2, $3, $4)",
          [
            randomUUID(),
            "Forbidden",
            "forbidden@example.invalid",
            passwordHash,
          ],
        ),
      ).rejects.toMatchObject({ code: "42501" });

      await writeFile(
        join(directory, "fails.sql"),
        "CREATE TABLE app.rolled_back (id integer); SELECT * FROM app.nonexistent;",
      );
      await expect(
        applySchema(
          ownerUrl.toString(),
          pathToFileURL(join(directory, "fails.sql")),
        ),
      ).rejects.toThrow();
      expect(
        (
          await pool.query(
            "SELECT to_regclass('app.rolled_back') AS table_name",
          )
        ).rows[0].table_name,
      ).toBeNull();
      expect(
        (
          await pool.query(
            "SELECT to_regclass('public.schema_migrations') AS table_name",
          )
        ).rows[0].table_name,
      ).toBeNull();
    } finally {
      vi.unstubAllEnvs();
      if (pool) await pool.end();
      if (schemaClient) await schemaClient.end();
      Reflect.deleteProperty(globalThis, "appDatabasePool");
      if (created)
        await owner.query(`DROP DATABASE ${pg.escapeIdentifier(databaseName)}`);
      await owner.end();
      await rm(directory, { recursive: true });
    }
  },
  30000,
);
