import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getDatabasePool: () => ({ query }) }));

import { authenticateCredentials } from "@/lib/credentials";

beforeEach(() => vi.resetAllMocks());

describe("authenticateCredentials", () => {
  it("normalizes email and returns only safe identity fields", async () => {
    const hash = await bcrypt.hash("valid-password", 4);
    query.mockResolvedValue({
      rows: [
        {
          id: "id-1",
          name: "User",
          email: "user@example.test",
          password_hash: hash,
        },
      ],
    });
    expect(
      await authenticateCredentials({
        email: " USER@example.test ",
        password: "valid-password",
      }),
    ).toEqual({ id: "id-1", name: "User", email: "user@example.test" });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE lower(email) = $1"),
      ["user@example.test"],
    );
  });

  it("returns null for an incorrect password or unknown account", async () => {
    const hash = await bcrypt.hash("valid-password", 4);
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "1",
          name: "User",
          email: "user@example.test",
          password_hash: hash,
        },
      ],
    });
    query.mockResolvedValueOnce({ rows: [] });
    expect(
      await authenticateCredentials({
        email: "user@example.test",
        password: "wrong-password",
      }),
    ).toBeNull();
    expect(
      await authenticateCredentials({
        email: "missing@example.test",
        password: "wrong-password",
      }),
    ).toBeNull();
  });

  it.each([
    null,
    {},
    { email: 123, password: "password" },
    { email: "invalid", password: "password" },
    { email: "a\0@example.test", password: "password" },
    { email: "a@example.test", password: "short" },
    { email: "a@example.test", password: "é".repeat(37) },
  ])("rejects malformed credentials without a query", async (input) => {
    expect(await authenticateCredentials(input)).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });

  it("surfaces a sanitized database failure", async () => {
    query.mockRejectedValue(new Error("sensitive database error"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(
        authenticateCredentials({
          email: "user@example.test",
          password: "password",
        }),
      ).rejects.toThrow("Credential lookup failed");
      expect(log).toHaveBeenCalledWith("Credential lookup failed");
    } finally {
      log.mockRestore();
    }
  });
});
