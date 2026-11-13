import type { JSX } from "react";

const UserPage = (): JSX.Element => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-lg shadow p-6 border border-slate-200 dark:border-slate-700">
        <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-white text-center">
          Users
        </h2>
        <p className="text-slate-700 dark:text-slate-300 text-center">
          User listing is unavailable until admin authorization is implemented.
        </p>
      </div>
    </div>
  );
};

export default UserPage;
