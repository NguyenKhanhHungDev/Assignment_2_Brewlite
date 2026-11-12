import type { Product } from "@/lib/products";

export const products: Product[] = [
  { id: 1, name: "Cà phê sữa", price: 35000, imageUrl: "/images/products/ca-phe-sua.jpg",
    category: "COFFEE", stock: 8, stockBySize: { S: 10, M: 8, L: 6 } },
  { id: 2, name: "Cà phê muối", price: 42000, imageUrl: "/images/products/ca-phe-muoi.jpg",
    category: "COFFEE", stock: 4 },
  { id: 3, name: "Trà đào", price: 39000, imageUrl: "/images/products/tra-dao.jpg",
    category: "TEA", stock: 2 },
  { id: 4, name: "Matcha latte", price: 49000, imageUrl: "/images/products/matcha-latte.jpg",
    category: "OTHER", stock: 5 },
];
