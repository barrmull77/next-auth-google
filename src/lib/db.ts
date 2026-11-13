import "server-only";
import { Pool } from "pg";

const database = globalThis as typeof globalThis & { appDatabasePool?: Pool };

export function getDatabasePool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL must be configured");
  }

  if (!database.appDatabasePool) {
    database.appDatabasePool = new Pool({
      connectionString,
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
    database.appDatabasePool.on("error", () => {
      console.error("An idle PostgreSQL connection failed");
    });
  }
  return database.appDatabasePool;
}
