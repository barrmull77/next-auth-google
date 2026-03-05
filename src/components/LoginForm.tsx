"use client";
import type { JSX } from "react";
import SocialLogins from "./SocialLogins";
import { doCredentialLogin } from "@/app/actions";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

const LoginForm = (): JSX.Element => {
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const formData = new FormData(event.currentTarget);
      debugger
      const response = await doCredentialLogin(formData);
      if (!!response?.error) {
        console.error(response.error);
        setError(response.error.message);
      } else {
        router.push("/products");
      }
    } catch (e) {
      console.error(e);
      setError("Check your Credentials");
    }
  }

  return (
    <>
      <div className="text-xl text-red-500">{error}</div>
      <form
        className="my-5 flex flex-col items-center border p-3 border-gray-200 rounded-md"
        onSubmit={onSubmit}
      >
        <div className="my-2 w-full flex flex-col items-start">
          <label htmlFor="email" className="mb-1 text-slate-700 dark:text-slate-200">Email Address</label>
          <input
            className="border border-gray-500 rounded px-3 py-2 w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            type="email"
            name="email"
            id="email"
            required
          />
        </div>
        <div className="my-2 w-full flex flex-col items-start">
          <label htmlFor="password" className="mb-1 text-slate-700 dark:text-slate-200">Password</label>
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
          className="bg-orange-300 mt-4 rounded flex justify-center items-center w-36 font-semibold py-2 hover:bg-orange-400 transition-colors"
        >
          Credential Login
        </button>
      </form>
      <SocialLogins />
    </>
  );
};

export default LoginForm;
