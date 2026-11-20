import "server-only";
import pg from "pg";
import { getDatabasePool } from "@/lib/db";

interface GoogleIdentity {
  sub: string;
  name: string;
  email: string;
}

interface GoogleUser {
  id: string;
  name: string;
  email: string;
}

type GoogleSignInResult =
  | { user: GoogleUser }
  | { error: "GoogleProfileInvalid" | "GoogleAccountConflict" };

function validateProfile(
  profile: unknown,
  providerAccountId: string,
): GoogleIdentity | null {
  if (
    typeof profile !== "object" ||
    profile === null ||
    !("sub" in profile) ||
    typeof profile.sub !== "string" ||
    !profile.sub.trim() ||
    profile.sub !== profile.sub.trim() ||
    profile.sub.includes("\0") ||
    profile.sub !== providerAccountId ||
    !("email_verified" in profile) ||
    profile.email_verified !== true ||
    !("email" in profile) ||
    typeof profile.email !== "string" ||
    !("name" in profile) ||
    typeof profile.name !== "string"
  ) {
    return null;
  }

  const name = profile.name.trim();
  const email = profile.email.trim().toLowerCase();
  if (
    !name ||
    name.length > 100 ||
    name.includes("\0") ||
    email.length > 254 ||
    email.includes("\0") ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return null;
  }
  return { sub: profile.sub, name, email };
}

async function findGoogleUser(
  client: pg.PoolClient,
  providerAccountId: string,
): Promise<GoogleUser | undefined> {
  const result = await client.query<GoogleUser>(
    `SELECT u.id, u.name, u.email
     FROM app.users u
     JOIN app.accounts a ON a.user_id = u.id
     WHERE a.provider = 'google' AND a.provider_account_id = $1`,
    [providerAccountId],
  );
  return result.rows[0];
}

async function persistGoogleUser(
  identity: GoogleIdentity,
): Promise<GoogleSignInResult> {
  const client = await getDatabasePool().connect();
  try {
    await client.query("BEGIN");
    const existing = await findGoogleUser(client, identity.sub);
    if (existing) {
      await client.query("COMMIT");
      return { user: existing };
    }

    const inserted = await client.query<GoogleUser>(
      "INSERT INTO app.users (name, email) VALUES ($1, $2) RETURNING id, name, email",
      [identity.name, identity.email],
    );
    const user = inserted.rows[0];
    if (!user) throw new Error("Google user creation returned no user");

    await client.query(
      "INSERT INTO app.accounts (user_id, provider, provider_account_id) VALUES ($1, 'google', $2)",
      [user.id, identity.sub],
    );
    await client.query("COMMIT");
    return { user };
  } catch (error) {
    await client.query("ROLLBACK");
    if (
      error instanceof pg.DatabaseError &&
      error.code === "23505" &&
      (error.constraint === "users_email_unique" ||
        error.constraint === "accounts_pkey")
    ) {
      // Another callback may have committed the same Google identity meanwhile.
      const existing = await findGoogleUser(client, identity.sub);
      if (existing) return { user: existing };
      if (error.constraint === "users_email_unique") {
        return { error: "GoogleAccountConflict" };
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function resolveGoogleUser(
  profile: unknown,
  providerAccountId: string,
): Promise<GoogleSignInResult> {
  const identity = validateProfile(profile, providerAccountId);
  if (!identity) return { error: "GoogleProfileInvalid" };

  try {
    return await persistGoogleUser(identity);
  } catch {
    console.error("Google sign-in persistence failed");
    throw new Error("Google sign-in persistence failed");
  }
}
