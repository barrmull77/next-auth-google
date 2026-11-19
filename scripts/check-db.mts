import pg from "pg";

interface RuntimePermissions {
  runtime_login: boolean;
  restricted: boolean;
  app_usage: boolean;
  app_create: boolean;
  public_create: boolean;
  no_memberships: boolean;
  insert_columns: boolean;
  select_columns: boolean;
  account_insert_columns: boolean;
  account_select_columns: boolean;
  forbidden_access: boolean;
}

async function check(): Promise<void> {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL must be configured");

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });

  try {
    const result = await pool.query<RuntimePermissions>(`
      SELECT current_user = 'next_auth_runtime' AS runtime_login,
        NOT (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls) AS restricted,
        has_schema_privilege(current_user, 'app', 'USAGE') AS app_usage,
        has_schema_privilege(current_user, 'app', 'CREATE') AS app_create,
        has_schema_privilege(current_user, 'public', 'CREATE') AS public_create,
        NOT EXISTS (SELECT 1 FROM pg_auth_members WHERE member = pg_roles.oid) AS no_memberships,
        has_column_privilege(current_user, 'app.users', 'name', 'INSERT')
          AND has_column_privilege(current_user, 'app.users', 'email', 'INSERT')
          AND has_column_privilege(current_user, 'app.users', 'password_hash', 'INSERT') AS insert_columns,
        has_column_privilege(current_user, 'app.users', 'id', 'SELECT')
          AND has_column_privilege(current_user, 'app.users', 'name', 'SELECT')
          AND has_column_privilege(current_user, 'app.users', 'email', 'SELECT')
          AND has_column_privilege(current_user, 'app.users', 'password_hash', 'SELECT') AS select_columns,
        has_column_privilege(current_user, 'app.accounts', 'user_id', 'INSERT')
          AND has_column_privilege(current_user, 'app.accounts', 'provider', 'INSERT')
          AND has_column_privilege(current_user, 'app.accounts', 'provider_account_id', 'INSERT') AS account_insert_columns,
        has_column_privilege(current_user, 'app.accounts', 'user_id', 'SELECT')
          AND has_column_privilege(current_user, 'app.accounts', 'provider', 'SELECT')
          AND has_column_privilege(current_user, 'app.accounts', 'provider_account_id', 'SELECT') AS account_select_columns,
        has_column_privilege(current_user, 'app.users', 'created_at', 'SELECT')
          OR has_column_privilege(current_user, 'app.users', 'updated_at', 'SELECT')
          OR has_any_column_privilege(current_user, 'app.users', 'UPDATE')
          OR has_table_privilege(current_user, 'app.users', 'DELETE')
          OR has_column_privilege(current_user, 'app.users', 'id', 'INSERT')
          OR has_column_privilege(current_user, 'app.users', 'created_at', 'INSERT')
          OR has_column_privilege(current_user, 'app.users', 'updated_at', 'INSERT')
          OR has_any_column_privilege(current_user, 'app.accounts', 'UPDATE')
          OR has_table_privilege(current_user, 'app.accounts', 'DELETE')
          OR has_table_privilege(current_user, 'app.accounts', 'TRUNCATE') AS forbidden_access
      FROM pg_roles WHERE rolname = current_user
    `);

    const row = result.rows[0];

    if (
      !row?.runtime_login ||
      !row.restricted ||
      !row.no_memberships ||
      !row.app_usage ||
      row.app_create ||
      row.public_create ||
      !row.insert_columns ||
      !row.select_columns ||
      !row.account_insert_columns ||
      !row.account_select_columns ||
      row.forbidden_access
    ) {
      throw new Error(
        "Application login permissions do not match the restricted contract",
      );
    }

    console.log(
      "PostgreSQL connection verified: runtime login can insert and read authentication fields and Google account associations, but cannot update or delete them.",
    );
  } finally {
    await pool.end();
  }
}

check().catch(() => {
  console.error(
    "Database check failed. Verify DATABASE_URL, schema setup, and restricted runtime permissions.",
  );
  process.exitCode = 1;
});
