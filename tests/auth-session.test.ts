import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { Auth } from "@auth/core";
import { encode } from "@auth/core/jwt";
import type { NextAuthConfig, User } from "next-auth";
import { authConfig } from "@/auth.config";

const { captureConfig, resolveGoogleUser } = vi.hoisted(() => ({
  captureConfig: vi.fn(),
  resolveGoogleUser: vi.fn(),
}));

vi.mock("next-auth", () => ({
  default: (config: NextAuthConfig) => {
    captureConfig(config);
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
  },
}));
vi.mock("@/lib/credentials", () => ({ authenticateCredentials: vi.fn() }));
vi.mock("@/lib/google", () => ({ resolveGoogleUser }));

let config: NextAuthConfig;
beforeAll(async () => {
  await import("@/auth");
  config = captureConfig.mock.calls[0][0];
});

afterEach(() => {
  vi.restoreAllMocks();
  resolveGoogleUser.mockReset();
});

function callbacks() {
  const { signIn, jwt } = config.callbacks ?? {};
  if (!signIn || !jwt) throw new Error("Missing authentication callbacks");
  return { signIn, jwt };
}

const applicationUser = {
  id: "application-user-id",
  name: "Example User",
  email: "demo@example.test",
};
const googleAccount = {
  provider: "google",
  providerAccountId: "synthetic-google-id",
  type: "oidc",
} as const;

it.each(["credentials", "google"] as const)(
  "uses the database identity for %s sessions without exposing or refreshing provider tokens",
  async (provider) => {
    const { signIn, jwt } = callbacks();
    const image =
      provider === "google"
        ? "https://lh3.googleusercontent.com/synthetic-photo"
        : undefined;
    const user: User = { ...applicationUser, image };
    const profile = {
      sub: googleAccount.providerAccountId,
      email_verified: true,
      name: applicationUser.name,
      email: applicationUser.email,
    };
    const account =
      provider === "google"
        ? {
            ...googleAccount,
            access_token: "synthetic-access-token",
            refresh_token: "synthetic-refresh-token",
          }
        : {
            provider,
            providerAccountId: applicationUser.id,
            type: "credentials" as const,
          };
    if (provider === "google") {
      user.id = "temporary-authjs-id";
      user.email = "provider@example.test";
      resolveGoogleUser.mockResolvedValue({ user: applicationUser });
    }

    expect(await signIn({ user, account, profile })).toBe(true);
    const signedIn = await jwt({ token: {}, user, account });
    expect(signedIn).toEqual({
      sub: applicationUser.id,
      name: applicationUser.name,
      email: applicationUser.email,
      picture: image,
      authProvider: provider,
    });
    if (!signedIn) throw new Error("Expected signed-in token");

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const continued = await jwt({ token: signedIn, user: {} });
    expect(continued).toEqual(signedIn);
    const secret = "synthetic-session-test-secret";
    const cookieName = "authjs.session-token";
    const cookie = await encode({ token: signedIn, secret, salt: cookieName });
    for (const runtimeConfig of [config, authConfig]) {
      const response = await Auth(
        new Request("http://localhost/api/auth/session", {
          headers: { cookie: `${cookieName}=${cookie}` },
        }),
        {
          ...runtimeConfig,
          secret,
          trustHost: true,
          basePath: "/api/auth",
        },
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        user: { ...applicationUser, ...(image ? { image } : {}) },
        expires: expect.any(String),
      });
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    if (provider === "google") {
      expect(resolveGoogleUser).toHaveBeenCalledExactlyOnceWith(
        profile,
        googleAccount.providerAccountId,
      );
    } else {
      expect(resolveGoogleUser).not.toHaveBeenCalled();
    }
  },
);

it.each(["GoogleAccountConflict", "GoogleProfileInvalid"] as const)(
  "rejects Google sign-in with a safe %s redirect",
  async (error) => {
    resolveGoogleUser.mockResolvedValue({ error });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const profile = { sub: googleAccount.providerAccountId };
    expect(
      await callbacks().signIn({
        user: { id: "temporary-id" },
        account: googleAccount,
        profile,
      }),
    ).toBe(`/login?error=${error}`);
    expect(resolveGoogleUser).toHaveBeenCalledWith(
      profile,
      googleAccount.providerAccountId,
    );
    expect(warn).toHaveBeenCalledWith("Google sign-in rejected", {
      reason: error,
    });
  },
);

it("does not allow a session after Google persistence fails", async () => {
  resolveGoogleUser.mockRejectedValue(
    new Error("Google sign-in persistence failed"),
  );
  await expect(
    callbacks().signIn({ user: {}, account: googleAccount }),
  ).rejects.toThrow("Google sign-in persistence failed");
});

it("requires legacy Google sessions to sign in again", async () => {
  expect(
    await callbacks().jwt({
      token: {
        sub: "unpersisted-google-user",
        user: { id: "unpersisted-google-user" },
        accessToken: "synthetic-old-token",
      },
      user: {},
    }),
  ).toBeNull();
});

it("preserves existing credential sessions while stripping obsolete fields", async () => {
  expect(
    await callbacks().jwt({
      token: {
        sub: applicationUser.id,
        name: applicationUser.name,
        email: applicationUser.email,
        authProvider: "credentials",
        user: applicationUser,
      },
      user: {},
    }),
  ).toEqual({
    sub: applicationUser.id,
    name: applicationUser.name,
    email: applicationUser.email,
    authProvider: "credentials",
  });
});
