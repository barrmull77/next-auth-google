import type { JSX } from "react";

const DashboardPage = (): JSX.Element => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-100 to-slate-300 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-lg p-8 flex flex-col items-center border border-slate-200 dark:border-slate-700">
        <h1 className="text-4xl font-bold mb-6 text-slate-800 dark:text-white">
          Dashboard
        </h1>
        <p className="text-lg text-slate-700 dark:text-slate-300">
          Welcome to your dashboard!
        </p>
      </div>
    </div>
  );
};

export default DashboardPage;
