import bcrypt from "bcryptjs";
import pg from "pg";
import { getDatabasePool } from "@/lib/db";

const PASSWORD_ROUNDS = 12;

interface Registration {
  name: string;
  email: string;
  password: string;
}

function validateRegistration(value: unknown): Registration | null {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return null;

  const { name, email, password } = value as Record<string, unknown>;
  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string"
  )
    return null;

  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (
    !normalizedName ||
    normalizedName.length > 100 ||
    normalizedName.includes("\0") ||
    normalizedEmail.length > 254 ||
    normalizedEmail.includes("\0") ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
    password.length < 8 ||
    bcrypt.truncates(password)
  )
    return null;

  return {
    name: normalizedName,
    email: normalizedEmail,
    password,
  };
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return new Response("Invalid JSON", { status: 400 });
    }
    console.error("Failed to read registration request");
    return new Response("Unable to register", { status: 500 });
  }

  const registration = validateRegistration(body);
  if (!registration) {
    return new Response(
      "Enter a name (up to 100 characters), valid email (up to 254 characters) and password of at least 8 characters and at most 72 UTF-8 bytes.",
      { status: 400 },
    );
  }

  try {
    const passwordHash = await bcrypt.hash(
      registration.password,
      PASSWORD_ROUNDS,
    );
    const result = await getDatabasePool().query(
      "INSERT INTO app.users (name, email, password_hash) VALUES ($1, $2, $3)",
      [registration.name, registration.email, passwordHash],
    );
    if (result.rowCount !== 1)
      throw new Error("Unexpected registration insert count");
    return new Response("User has been created", { status: 201 });
  } catch (error) {
    if (
      error instanceof pg.DatabaseError &&
      error.code === "23505" &&
      error.constraint === "users_email_unique"
    ) {
      return new Response("An account with that email already exists", {
        status: 409,
      });
    }
    console.error("Failed to register user");
    return new Response("Unable to register", { status: 500 });
  }
}
