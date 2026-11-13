import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, getUserByEmail } = vi.hoisted(() => ({
  auth: vi.fn(),
  getUserByEmail: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/data/users", () => ({ getUserByEmail }));

import { GET as getMe } from "@/app/api/me/route";
import { GET as getUsers } from "@/app/api/users/route";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/me", () => {
  it("rejects requests without an authenticated user", async () => {
    auth.mockResolvedValue(null);

    const response = await getMe();

    expect(response.status).toBe(401);
    expect(getUserByEmail).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Unauthenticated" });
  });

  it("returns only approved fields for the authenticated user", async () => {
    auth.mockResolvedValue({ user: { email: "user@example.test" } });
    getUserByEmail.mockReturnValue({
      name: "Example",
      email: "user@example.test",
      password: "secret-hash",
      role: "admin",
    });

    const response = await getMe();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(getUserByEmail).toHaveBeenCalledWith("user@example.test");
    expect(await response.json()).toEqual({
      name: "Example",
      email: "user@example.test",
    });
  });

  it("does not look up a user when the session has no email", async () => {
    auth.mockResolvedValue({ user: {} });

    expect((await getMe()).status).toBe(404);
    expect(getUserByEmail).not.toHaveBeenCalled();
  });

  it("returns 404 for an account not in the demo user store", async () => {
    auth.mockResolvedValue({ user: { email: "unknown@example.test" } });
    getUserByEmail.mockReturnValue(undefined);

    expect((await getMe()).status).toBe(404);
  });

  it("returns a generic error if lookup fails", async () => {
    auth.mockResolvedValue({ user: { email: "user@example.test" } });
    getUserByEmail.mockImplementation(() => {
      throw new Error("sensitive database error");
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await getMe();
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Unable to retrieve user",
      });
      expect(log).toHaveBeenCalledWith("Failed to retrieve current user");
    } finally {
      log.mockRestore();
    }
  });

  it("returns a generic error if session retrieval fails", async () => {
    auth.mockRejectedValue(new Error("sensitive session error"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await getMe();
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Unable to retrieve user",
      });
      expect(getUserByEmail).not.toHaveBeenCalled();
      expect(log).toHaveBeenCalledWith("Failed to retrieve current user");
    } finally {
      log.mockRestore();
    }
  });
});

describe("GET /api/users", () => {
  it("does not expose the demo user list", async () => {
    const response = await getUsers();

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "User listing is unavailable",
    });
    expect(auth).not.toHaveBeenCalled();
    expect(getUserByEmail).not.toHaveBeenCalled();
  });
});
