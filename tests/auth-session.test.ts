import { afterEach, expect, it, vi } from "vitest";
import type { NextAuthConfig } from "next-auth";

const { captureConfig } = vi.hoisted(() => ({
  captureConfig: vi.fn(),
}));

vi.mock("next-auth", () => ({
  default: (config: NextAuthConfig) => {
    captureConfig(config);
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
  },
}));
vi.mock("next-auth/providers/google", () => ({ default: vi.fn() }));
vi.mock("next-auth/providers/credentials", () => ({ default: vi.fn() }));
vi.mock("@/lib/credentials", () => ({ authenticateCredentials: vi.fn() }));

afterEach(() => {
  vi.restoreAllMocks();
});

it("does not refresh access tokens for credential sessions", async () => {
  await import("@/auth");
  const config: NextAuthConfig = captureConfig.mock.calls[0][0];
  const jwt = config.callbacks?.jwt;
  expect(jwt).toBeDefined();
  if (!jwt) throw new Error("Missing JWT callback");

  const user = { id: "demo-user", email: "demo@example.test" };
  const signedIn = await jwt({
    token: {},
    user,
    account: {
      provider: "credentials",
      providerAccountId: "demo-user",
      type: "credentials",
    },
  });
  if (!signedIn) throw new Error("Expected credential token");

  const fetchSpy = vi.spyOn(globalThis, "fetch");
  const continued = await jwt({ token: signedIn, user: {} });

  expect(continued).toEqual(signedIn);
  expect(fetchSpy).not.toHaveBeenCalled();
});
