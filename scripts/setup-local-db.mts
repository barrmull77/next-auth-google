import { randomBytes } from "node:crypto";
import { chmod, readFile, writeFile } from "node:fs/promises";
import pg from "pg";

interface RolePrivileges {
  rolsuper: boolean;
  rolcreatedb: boolean;
  rolcreaterole: boolean;
  rolreplication: boolean;
  rolbypassrls: boolean;
}

async function setup(): Promise<void> {
  const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB } = process.env;
  if (!POSTGRES_USER || !POSTGRES_PASSWORD || !POSTGRES_DB) {
    throw new Error("POSTGRES_USER, POSTGRES_PASSWORD and POSTGRES_DB must be configured");
  }

  // This command targets only the repository's loopback-bound Compose database.
  const ownerUrl = new URL("postgresql://127.0.0.1:5435");
  ownerUrl.username = POSTGRES_USER;
  ownerUrl.password = POSTGRES_PASSWORD;
  ownerUrl.pathname = `/${POSTGRES_DB}`;
  const runtimeUrl = new URL(ownerUrl);
  runtimeUrl.username = "next_auth_runtime";
  runtimeUrl.password = randomBytes(24).toString("hex");

  const envFile = new URL("../.env.local", import.meta.url);
  const previous = await readFile(envFile, "utf8");
  const client = new pg.Client({
    connectionString: ownerUrl.toString(),
    connectionTimeoutMillis: 5000,
  });
  await client.connect();
  try {
    await client.query("BEGIN");
    const roles = await client.query<RolePrivileges>(
      "SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls FROM pg_roles WHERE rolname = $1",
      ["next_auth_runtime"],
    );
    if (roles.rows.length) {
      if (roles.rows.some(row => Object.values(row).some(Boolean))) {
        throw new Error("Existing next_auth_runtime has elevated privileges; review it manually");
      }
      const memberships = await client.query(
        "SELECT 1 FROM pg_auth_members WHERE member = (SELECT oid FROM pg_roles WHERE rolname = $1)",
        ["next_auth_runtime"],
      );
      if (memberships.rows.length) {
        throw new Error("Existing next_auth_runtime has role memberships; review them manually");
      }
    } else {
      await client.query("CREATE ROLE next_auth_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS");
    }
    const passwordSql = await client.query<{ statement: string }>(
      "SELECT format('ALTER ROLE next_auth_runtime PASSWORD %L', $1::text) AS statement",
      [runtimeUrl.password],
    );
    await client.query(passwordSql.rows[0].statement);
    await client.query(`GRANT CONNECT ON DATABASE ${pg.escapeIdentifier(POSTGRES_DB)} TO next_auth_runtime`);
    const existing = new Set(["DATABASE_URL", "OWNER_DATABASE_URL", "MIGRATION_DATABASE_URL"]);
    const lines = previous.split("\n").filter(line =>
      !existing.has(line.replace(/^\s*(?:export\s+)?/, "").split("=")[0].trim()),
    );
    const updated = `${lines.join("\n").trimEnd()}\nOWNER_DATABASE_URL=${JSON.stringify(ownerUrl.toString())}\nDATABASE_URL=${JSON.stringify(runtimeUrl.toString())}\n`;
    await writeFile(envFile, updated, { mode: 0o600 });
    await chmod(envFile, 0o600);
    await client.query("COMMIT");
    console.log("Local runtime login configured; connection URLs saved in .env.local.");
  } catch (error) {
    await client.query("ROLLBACK");
    await writeFile(envFile, previous, { mode: 0o600 });
    throw error;
  } finally {
    await client.end();
  }
}

setup().catch(() => {
  console.error("Local database setup failed. Check local PostgreSQL availability, owner credentials, and role privileges. Secrets are not printed.");
  process.exitCode = 1;
});
