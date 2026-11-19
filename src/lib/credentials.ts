import "server-only";
import bcrypt from "bcryptjs";
import { getDatabasePool } from "@/lib/db";

interface CredentialRow {
  id: string;
  name: string;
  email: string;
  password_hash: string | null;
}

interface CredentialUser {
  id: string;
  name: string;
  email: string;
}

const DUMMY_HASH =
  "$2b$12$f0vLe.2Iyjno7tfEMXi21O7.x6YHn8um6hS6E525caK.JzV8CFK3.";

export async function authenticateCredentials(
  credentials: Partial<Record<string, unknown>> | null | undefined,
): Promise<CredentialUser | null> {
  const email = credentials?.email;
  const password = credentials?.password;
  if (typeof email !== "string" || typeof password !== "string") return null;

  const normalizedEmail = email.trim().toLowerCase();
  if (
    normalizedEmail.length > 254 ||
    normalizedEmail.includes("\0") ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
    password.length < 8 ||
    bcrypt.truncates(password)
  ) {
    return null;
  }

  let user: CredentialRow | undefined;
  try {
    const result = await getDatabasePool().query<CredentialRow>(
      "SELECT id, name, email, password_hash FROM app.users WHERE lower(email) = $1",
      [normalizedEmail],
    );
    user = result.rows[0];
  } catch {
    console.error("Credential lookup failed");
    throw new Error("Credential lookup failed");
  }

  const matches = await bcrypt.compare(
    password,
    user?.password_hash ?? DUMMY_HASH,
  );
  if (!user?.password_hash || !matches) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}
