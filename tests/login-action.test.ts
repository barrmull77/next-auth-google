import { AuthError, CredentialsSignin } from "@auth/core/errors";
import { beforeEach, expect, it, vi } from "vitest";

const { signIn, revalidatePath } = vi.hoisted(() => ({
  signIn: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/auth", () => ({ signIn, signOut: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next-auth", async () => {
  const errors = await import("@auth/core/errors");
  return { AuthError: errors.AuthError };
});

import { doCredentialLogin } from "@/app/actions";

function credentials(): FormData {
  const form = new FormData();
  form.set("email", "user@example.test");
  form.set("password", "example-password");
  return form;
}

beforeEach(() => vi.resetAllMocks());

it("signs in and returns success", async () => {
  signIn.mockResolvedValue("http://localhost:3000/products");
  expect(await doCredentialLogin(credentials())).toEqual({});
  expect(revalidatePath).toHaveBeenCalledWith("/");
});

it("returns a generic invalid-credentials message", async () => {
  signIn.mockRejectedValue(new CredentialsSignin());
  expect(await doCredentialLogin(credentials())).toEqual({
    error: "Invalid email or password.",
  });
  expect(revalidatePath).not.toHaveBeenCalled();
});

it("does not reveal unexpected authentication failures", async () => {
  signIn.mockRejectedValue(new AuthError("sensitive database error"));
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    expect(await doCredentialLogin(credentials())).toEqual({
      error: "Unable to sign in. Please try again.",
    });
    expect(log).toHaveBeenCalledWith("Credential sign-in failed");
    expect(revalidatePath).not.toHaveBeenCalled();
  } finally {
    log.mockRestore();
  }
});
