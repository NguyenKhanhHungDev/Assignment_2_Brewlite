"use client";

import React from "react";
import type { Product } from "@/lib/products";
import ProductImage from "./ProductImage";
import { ExclamationIcon } from "./Icons";

export default function ProductCard({ product }: { product: Product }) {
  const maxStock = product.stockBySize
    ? Math.max(...Object.values(product.stockBySize))
    : product.stock;
  const isSoldOut = maxStock === 0;

  return (
    <article
      className={`bl-product-card ${isSoldOut ? "bl-product-soldout" : ""}`}
      aria-label={`${product.name}, giá ${product.price.toLocaleString("vi-VN")} đồng${isSoldOut ? ", hiện đã hết hàng" : ""}`}
    >
      <div className="bl-product-image-wrap">
        <ProductImage src={product.imageUrl} name={product.name} />

        {isSoldOut ? (
          <div className="bl-soldout-overlay">
            <span className="bl-soldout-badge">
              <ExclamationIcon size={16} /> Tạm hết nguyên liệu
            </span>
          </div>
        ) : null}
      </div>

      <div className="bl-product-info">
        <div className="bl-product-title-row">
          <h3 className="bl-product-title">
            {product.name}
          </h3>
        </div>

        <div className="bl-product-meta">
          <p className="bl-product-price">
            {product.price.toLocaleString("vi-VN")} <span className="bl-price-unit">VND</span>
          </p>
        </div>

        <p className="bl-stock-hint">{isSoldOut ? "Tạm hết hàng" : "Còn hàng"} · Giá size M</p>
      </div>
    </article>
  );
}
