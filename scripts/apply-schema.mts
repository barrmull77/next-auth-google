import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import pg from "pg";

export async function applySchema(
  connectionString: string | undefined,
  file: URL = new URL("../db/schema.sql", import.meta.url),
): Promise<void> {
  if (!connectionString)
    throw new Error("OWNER_DATABASE_URL must be configured");

  const sql = await readFile(file, "utf8");
  const client = new pg.Client({
    connectionString,
    connectionTimeoutMillis: 5000,
  });

  await client.connect();

  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  applySchema(process.env.OWNER_DATABASE_URL).then(
    () => console.log("Database schema applied."),
    () => {
      console.error(
        "Schema setup failed. Check OWNER_DATABASE_URL and db/schema.sql. Secrets are not printed.",
      );
      process.exitCode = 1;
    },
  );
}
