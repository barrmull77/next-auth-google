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
      await applySchema(ownerUrl.toString());

      schemaClient = new pg.Client({ connectionString: ownerUrl.toString() });
      await schemaClient.connect();
      const passwordHash = await bcrypt.hash("synthetic-test-password", 5);
      const inserted = await schemaClient.query(
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
        ["Test", "other@example.invalid", null, "23502"],
      ]) {
        await expect(
          schemaClient.query(
            "INSERT INTO app.users (name, email, password_hash) VALUES ($1, $2, $3)",
            [name, email, hash],
          ),
        ).rejects.toMatchObject({ code });
      }
      await expect(
        schemaClient.query(
          "INSERT INTO app.users (name, email) VALUES ($1, $2)",
          ["Test", "missing@example.invalid"],
        ),
      ).rejects.toMatchObject({ code: "23502" });
      await applySchema(ownerUrl.toString());
      expect(
        (
          await schemaClient.query(
            "SELECT count(*)::integer AS count FROM app.users",
          )
        ).rows,
      ).toEqual([{ count: 1 }]);

      vi.stubEnv("DATABASE_URL", runtimeUrl.toString());
      pool = getDatabasePool();
      expect((await pool.query("SELECT current_user AS role")).rows).toEqual([
        { role: "next_auth_runtime" },
      ]);
      await expect(
        pool.query("CREATE TABLE app.forbidden (id integer)"),
      ).rejects.toMatchObject({ code: "42501" });
      await expect(
        pool.query("SELECT id FROM app.users"),
      ).rejects.toMatchObject({ code: "42501" });
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
