import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/auth", () => ({ auth }));

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
    expect(await response.json()).toEqual({ error: "Unauthenticated" });
  });

  it("returns only name and email from the authenticated session", async () => {
    auth.mockResolvedValue({
      user: { name: "Example", email: "user@example.test", id: "private-id" },
    });
    const response = await getMe();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      name: "Example",
      email: "user@example.test",
    });
  });

  it("rejects a session with no email", async () => {
    auth.mockResolvedValue({ user: {} });
    expect((await getMe()).status).toBe(404);
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
      expect(log).toHaveBeenCalledWith("Failed to retrieve current user");
    } finally {
      log.mockRestore();
    }
  });
});

describe("GET /api/users", () => {
  it("does not expose the user list", async () => {
    const response = await getUsers();
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "User listing is unavailable",
    });
    expect(auth).not.toHaveBeenCalled();
  });
});
