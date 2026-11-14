import type { ReactNode } from "react";
import CartProvider, { useCart } from "@/components/CartProvider";
import { ToastProvider } from "@/components/Toast";

export function MenuProviders({ children }: { children: ReactNode }) {
  return <CartProvider><ToastProvider><CartReady />{children}</ToastProvider></CartProvider>;
}

function CartReady() {
  return <span hidden data-testid="cart-ready">{String(useCart().ready)}</span>;
}
