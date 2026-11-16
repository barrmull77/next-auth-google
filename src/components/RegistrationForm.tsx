"use client";
import type { JSX } from "react";
import SocialLogins from "./SocialLogins";
import { FormEvent, useState } from "react";

const RegistrationForm = (): JSX.Element => {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setMessage("");
    setPending(true);
    try {
      const formData = new FormData(form);
      const name = formData.get("name") as string;
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;
      const response = await fetch(`/api/register`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      if (response.status === 201) {
        form.reset();
        setMessage("Account saved. You can now sign in.");
      } else {
        setMessage(await response.text());
      }
    } catch {
      setMessage("Unable to register. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="my-5 flex flex-col items-center border p-3 border-gray-200 rounded-md"
      >
        <div className="my-2 w-full flex flex-col items-start">
          <label
            htmlFor="name"
            className="mb-1 text-slate-700 dark:text-slate-200"
          >
            Name
          </label>
          <input
            className="border border-gray-500 rounded px-3 py-2 w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            type="text"
            name="name"
            id="name"
            maxLength={100}
            required
          />
        </div>
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
            maxLength={254}
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
            minLength={8}
            required
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="bg-orange-300 mt-4 rounded flex justify-center items-center w-36 font-semibold py-2 hover:bg-orange-400 transition-colors"
        >
          {pending ? "Registering..." : "Register"}
        </button>
        {message && (
          <p role="status" className="mt-4 text-sm">
            {message}
          </p>
        )}
      </form>
      <SocialLogins />
    </>
  );
};

export default RegistrationForm;
