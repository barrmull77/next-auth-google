import type { JSX } from "react";
import { getProductById } from "@/data/products";
import Link from "next/link";

interface ProductDetailsPageProps {
  params: { id: string };
}

const ProductDetailsPage = async ({ params }: ProductDetailsPageProps): Promise<JSX.Element> => {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-100 to-slate-300 dark:from-slate-900 dark:to-slate-800">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-lg p-8 flex flex-col items-center border border-slate-200 dark:border-slate-700">
          <p className="text-2xl text-red-500">Product not found.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-100 to-slate-300 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-lg p-8 flex flex-col items-center border border-slate-200 dark:border-slate-700">
        <p className="text-5xl mb-4">{product.image}</p>
        <p className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{product.name}</p>
        <p className="my-3 text-slate-700 dark:text-slate-300">{product.details}</p>
        <Link className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-800 transition-colors mt-4" href={`/products/${id}/checkout`}>Buy It</Link>
      </div>
    </div>
  );
};

export default ProductDetailsPage;
