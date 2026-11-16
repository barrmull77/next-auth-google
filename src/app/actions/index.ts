"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";

export async function doSocialLogin(formData: FormData): Promise<void> {
  const action = formData.get("action") as string;
  await signIn(action, { redirectTo: "/" });
}

export async function doLogout(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

export interface CredentialLoginResponse {
  error?: string;
}

export async function doCredentialLogin(
  formData: FormData,
): Promise<CredentialLoginResponse> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
      redirectTo: "/products",
    });
    revalidatePath("/");
    return {};
  } catch (err) {
    if (err instanceof AuthError && err.type === "CredentialsSignin") {
      return { error: "Invalid email or password." };
    }
    console.error("Credential sign-in failed");
    return { error: "Unable to sign in. Please try again." };
  }
}
