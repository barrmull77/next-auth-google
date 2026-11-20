import { beforeEach, describe, expect, it, vi } from "vitest";

const { connect } = vi.hoisted(() => ({ connect: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getDatabasePool: () => ({ connect }) }));

import { resolveGoogleUser } from "@/lib/google";

const profile = {
  sub: "synthetic-google-id",
  name: "Google User",
  email: "google@example.test",
  email_verified: true,
};

beforeEach(() => vi.resetAllMocks());

describe("resolveGoogleUser", () => {
  it.each([
    null,
    {},
    { ...profile, sub: undefined },
    { ...profile, sub: "different-google-id" },
    { ...profile, sub: " synthetic-google-id " },
    { ...profile, email_verified: undefined },
    { ...profile, email_verified: false },
    { ...profile, email_verified: "true" },
    { ...profile, email: null },
    { ...profile, email: "invalid" },
    { ...profile, email: "bad\0@example.test" },
    { ...profile, name: undefined },
    { ...profile, name: " " },
    { ...profile, name: "x".repeat(101) },
  ])(
    "rejects an invalid or unverified profile before database access",
    async (input) => {
      expect(await resolveGoogleUser(input, profile.sub)).toEqual({
        error: "GoogleProfileInvalid",
      });
      expect(connect).not.toHaveBeenCalled();
    },
  );

  it("reports database failures without exposing source values", async () => {
    connect.mockRejectedValue(new Error("sensitive connection details"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(resolveGoogleUser(profile, profile.sub)).rejects.toThrow(
        "Google sign-in persistence failed",
      );
      expect(log).toHaveBeenCalledExactlyOnceWith(
        "Google sign-in persistence failed",
      );
    } finally {
      log.mockRestore();
    }
  });
});
