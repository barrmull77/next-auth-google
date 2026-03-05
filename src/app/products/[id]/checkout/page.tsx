import type { JSX } from "react";

const CheckoutPage = (): JSX.Element => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-100 to-slate-300 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-lg p-8 flex flex-col items-center border border-slate-200 dark:border-slate-700">
        <h1 className="text-3xl font-bold mb-6 text-slate-800 dark:text-white">Checkout</h1>
        <p className="text-lg text-slate-700 dark:text-slate-300">Checkout Page</p>
      </div>
    </div>
  );
};

export default CheckoutPage;
