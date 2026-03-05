import type { JSX } from "react";
import RegistrationForm from '@/components/RegistrationForm';
import Link from 'next/link';

const RegisterPage = (): JSX.Element => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-100 to-slate-300 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-lg p-8 flex flex-col items-center border border-slate-200 dark:border-slate-700">
        <h1 className="text-4xl font-bold mb-6 text-slate-800 dark:text-white">Register</h1>
        <RegistrationForm />
        <p className="my-4 text-slate-600 dark:text-slate-300">
          Already have an account?
          <Link href="/login" className="mx-2 underline text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
