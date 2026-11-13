import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDatabasePool: () => ({ query }) }));

import { POST } from "@/app/api/register/route";

function request(body: string): Request {
  return new Request("http://localhost/api/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("POST /api/register", () => {
  it.each([
    "null",
    "[]",
    "{}",
    JSON.stringify({ name: "", email: "a@example.test", password: "password" }),
    JSON.stringify({ name: "A", email: "bad-email", password: "password" }),
    JSON.stringify({ name: "A", email: "a@example.test", password: "short" }),
    JSON.stringify({
      name: "A",
      email: "a@example.test",
      password: "a".repeat(73),
    }),
    JSON.stringify({
      name: "A",
      email: "a@example.test",
      password: "é".repeat(37),
    }),
    JSON.stringify({ name: 7, email: "a@example.test", password: "password" }),
    JSON.stringify({
      name: "A\0B",
      email: "a@example.test",
      password: "password",
    }),
    JSON.stringify({
      name: "A",
      email: "a\0@example.test",
      password: "password",
    }),
  ])("rejects invalid input without writing", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    expect((await POST(request("{"))).status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  it("does not expose database failures", async () => {
    query.mockRejectedValue(new Error("sensitive database error"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await POST(
        request(
          JSON.stringify({
            name: "User",
            email: "user@example.test",
            password: "example-password",
          }),
        ),
      );
      expect(response.status).toBe(500);
      expect(await response.text()).toBe("Unable to register");
      expect(log).toHaveBeenCalledWith("Failed to register user");
    } finally {
      log.mockRestore();
    }
  });
});
