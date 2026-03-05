import type { JSX } from "react";
import ProductList from "@/components/ProductList";

const ProductListPage = (): JSX.Element => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-100 to-slate-300 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-lg p-8 border border-slate-200 dark:border-slate-700">
        <h2 className="text-3xl font-bold mb-6 text-slate-800 dark:text-white text-center">Products</h2>
        <ProductList />
      </div>
    </div>
  );
};

export default ProductListPage;
