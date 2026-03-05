"use client";
import type { JSX } from "react";
import SocialLogins from "./SocialLogins";
import { useRouter } from "next/navigation";
import { FormEvent } from "react";

const RegistrationForm = (): JSX.Element => {
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const formData = new FormData(event.currentTarget);
      const name = formData.get('name') as string;
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      const response = await fetch(`/api/register`, {
        method: 'POST',
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ name, email, password })
      });
      
      if (response.status === 201) router.push('/');
    } catch (e: unknown) {
      if (e instanceof Error) {
        console.log(e.message);
      }
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="my-5 flex flex-col items-center border p-3 border-gray-200 rounded-md">
        <div className="my-2 w-full flex flex-col items-start">
          <label htmlFor="name" className="mb-1 text-slate-700 dark:text-slate-200">Name</label>
          <input
            className="border border-gray-500 rounded px-3 py-2 w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            type="text"
            name="name"
            id="name"
            required
          />
        </div>
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
          Register
        </button>
      </form>
      <SocialLogins />
    </>
  );
};

export default RegistrationForm;
