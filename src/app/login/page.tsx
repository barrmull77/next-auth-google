import type { JSX } from "react";
import LoginForm from "@/components/LoginForm";
import Link from "next/link";

const LoginPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}): Promise<JSX.Element> => {
  const { error } = await searchParams;
  const errorMessage =
    error === "GoogleAccountConflict"
      ? "An account with this email already exists. Sign in using your existing method. Connecting Google to it is not available yet."
      : error === "GoogleProfileInvalid"
        ? "Google sign-in requires a verified email address and a valid name."
        : error
          ? "Unable to sign in. Please try again."
          : null;
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-100 to-slate-300 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-lg p-8 flex flex-col items-center border border-slate-200 dark:border-slate-700">
        <h1 className="text-4xl font-bold mb-6 text-slate-800 dark:text-white">
          Sign In
        </h1>
        {errorMessage && (
          <p role="alert" className="text-red-600 dark:text-red-400">
            {errorMessage}
          </p>
        )}
        <LoginForm />
        <p className="my-4 text-slate-600 dark:text-slate-300">
          Don&apos;t have an account?
          <Link
            href="/register"
            className="mx-2 underline text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
