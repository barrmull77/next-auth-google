import Link from "next/link";
import type { JSX } from "react";

export default function Landing(): JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-100 to-slate-300 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-lg p-8 flex flex-col items-center border border-slate-200 dark:border-slate-700">
        <h1 className="text-4xl font-bold mb-6 text-slate-800 dark:text-white">
          Welcome
        </h1>
        <div className="flex flex-col gap-4 w-full">
          <Link
            className="text-xl font-semibold underline text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors text-center"
            href="/products"
          >
            All Products
          </Link>
          <Link
            className="text-xl font-semibold underline text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors text-center"
            href="/users"
          >
            All Users
          </Link>
        </div>
      </div>
    </div>
  );
}
