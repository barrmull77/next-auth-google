export interface Product {
  id: string;
  image: string;
  name: string;
  details: string;
}

const products: Product[] = [
  {
    id: "1",
    image: "⌚",
    name: "Watch",
    details: "Buy is for 156 EUR"
  },
  {
    id: "2",
    image: "🥒",
    name: "Cucumber",
    details: "2 KGS for 45.76 EUR"
  },
  {
    id: "3",
    image: "💻",
    name: "Laptop",
    details: "23K EUR"
  }
];

export const getAllProducts = (): Product[] => {
  return products;
};

export const getProductById = (id: string): Product | undefined => {
  return products.find(product => product.id === id);
};
