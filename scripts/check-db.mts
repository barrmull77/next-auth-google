import pg from "pg";

interface RuntimePermissions {
  runtime_login: boolean;
  restricted: boolean;
  app_usage: boolean;
  app_create: boolean;
  public_create: boolean;
  no_memberships: boolean;
}

async function check(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be configured");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  try {
    const result = await pool.query<RuntimePermissions>(`
      SELECT current_user = 'next_auth_runtime' AS runtime_login,
        NOT (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls) AS restricted,
        has_schema_privilege(current_user, 'app', 'USAGE') AS app_usage,
        has_schema_privilege(current_user, 'app', 'CREATE') AS app_create,
        has_schema_privilege(current_user, 'public', 'CREATE') AS public_create,
        NOT EXISTS (SELECT 1 FROM pg_auth_members WHERE member = pg_roles.oid) AS no_memberships
      FROM pg_roles WHERE rolname = current_user
    `);
    const row = result.rows[0];
    if (!row?.runtime_login || !row.restricted || !row.no_memberships || !row.app_usage || row.app_create || row.public_create) {
      throw new Error("Application login permissions do not match the restricted contract");
    }
    console.log("PostgreSQL connection verified: runtime login can use app schema, cannot create tables, and has no elevated role flags.");
  } finally {
    await pool.end();
  }
}

check().catch(() => {
  console.error("Database check failed. Verify DATABASE_URL, schema setup, and restricted runtime permissions.");
  process.exitCode = 1;
});
