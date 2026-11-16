"use client";
import type { JSX } from "react";
import SocialLogins from "./SocialLogins";
import { doCredentialLogin } from "@/app/actions";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

const LoginForm = (): JSX.Element => {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const formData = new FormData(event.currentTarget);
      const response = await doCredentialLogin(formData);
      if (response.error) {
        setError(response.error);
      } else {
        router.push("/products");
      }
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div role="alert" className="text-xl text-red-500">
        {error}
      </div>
      <form
        className="my-5 flex flex-col items-center border p-3 border-gray-200 rounded-md"
        onSubmit={onSubmit}
      >
        <div className="my-2 w-full flex flex-col items-start">
          <label
            htmlFor="email"
            className="mb-1 text-slate-700 dark:text-slate-200"
          >
            Email Address
          </label>
          <input
            className="border border-gray-500 rounded px-3 py-2 w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            type="email"
            name="email"
            id="email"
            required
          />
        </div>
        <div className="my-2 w-full flex flex-col items-start">
          <label
            htmlFor="password"
            className="mb-1 text-slate-700 dark:text-slate-200"
          >
            Password
          </label>
          <input
            className="border border-gray-500 rounded px-3 py-2 w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            type="password"
            name="password"
            id="password"
            required
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="bg-orange-300 mt-4 rounded flex justify-center items-center w-36 font-semibold py-2 hover:bg-orange-400 transition-colors"
        >
          {pending ? "Signing in..." : "Credential Login"}
        </button>
      </form>
      <SocialLogins />
    </>
  );
};

export default LoginForm;
