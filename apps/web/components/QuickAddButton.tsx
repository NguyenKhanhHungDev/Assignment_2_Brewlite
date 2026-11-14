"use client";

import type { Product } from "@/lib/products";
import { cartKey } from "@/lib/cart";
import { sizePrice } from "@/lib/pricing";
import { useCart } from "./CartProvider";
import { useToast } from "./Toast";
import { PlusIcon } from "./Icons";

export default function QuickAddButton({
  product,
  className = "bl-button bl-button-primary bl-btn-quick-add",
}: {
  product: Product;
  className?: string;
}) {
  const { add, ready, lines } = useCart();
  const toast = useToast();
  const stock = product.stockBySize?.M ?? product.stock;
  const usedStock = lines
    .filter(line => line.product.id === product.id && line.size === "M")
    .reduce((sum, line) => sum + line.quantity, 0);
  const quantity = lines.find(line => line.key === cartKey(product.id, "M", []))?.quantity ?? 0;
  const disabled = !ready || sizePrice(product.price, "M") === null || usedStock >= stock || quantity >= 99;
  const hint = !ready ? "Đang khôi phục giỏ hàng"
    : stock <= 0 ? "Size M tạm hết; hãy mở Tùy chọn để chọn size khác."
    : disabled ? "Đã đạt giới hạn số ly hoặc tồn kho size M."
    : "Thêm 1 ly size M, không topping";

  function quickAdd() {
    try {
      add(product, "M", [], 1);
      toast.success(`Đã thêm ${product.name}.`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Không thể thêm vào giỏ hàng.");
    }
  }

  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      onClick={quickAdd}
      aria-label={`Thêm nhanh 1 ly ${product.name} size M vào giỏ`}
      title={hint}
    >
      <PlusIcon size={18} />
      <span>{stock <= 0 ? "Hết size M" : "Thêm nhanh"}</span>
    </button>
  );
}
