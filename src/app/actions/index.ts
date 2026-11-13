"use server";

import { signIn, signOut } from "@/auth";
import { revalidatePath } from "next/cache";

export async function doSocialLogin(formData: FormData): Promise<void> {
  const action = formData.get("action") as string;
  await signIn(action, { redirectTo: "/" });
}

export async function doLogout(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

export interface CredentialLoginResponse {
  error?: { message: string };
  ok?: true;
  url?: string;
  [key: string]: unknown;
}

export async function doCredentialLogin(
  formData: FormData,
): Promise<CredentialLoginResponse | undefined> {
  try {
    const response = await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirect: false,
    });
    revalidatePath("/");
    return response as CredentialLoginResponse | undefined;
  } catch (err) {
    throw err;
  }
}
