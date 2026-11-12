import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProductCard from "@/components/ProductCard";
import { products } from "./fixtures";

describe("ProductCard stock and image states", () => {
  it("shows sold out only when every size is unavailable", () => {
    render(<ProductCard product={{ ...products[0], stock: 0, stockBySize: { S: 0, M: 0, L: 0 } }} />);
    expect(screen.getByRole("article")).toHaveAccessibleName(/hiện đã hết hàng/);
    expect(screen.getByText("Tạm hết hàng · Giá size M")).toBeVisible();
  });
  it("remains available if size S is in stock while M is unavailable", () => {
    render(<ProductCard product={{ ...products[0], stock: 0, stockBySize: { S: 1, M: 0, L: 0 } }} />);
    expect(screen.getByText("Còn hàng · Giá size M")).toBeVisible();
    expect(screen.queryByText("Tạm hết nguyên liệu")).not.toBeInTheDocument();
  });
  it("falls back on image failure and accepts a changed image URL", () => {
    const { rerender } = render(<ProductCard product={products[0]} />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByRole("img")).toHaveAttribute("src", "/images/drink-placeholder.svg");
    expect(screen.getByRole("img")).toHaveAccessibleName(`Ảnh minh họa thay thế cho ${products[0].name}`);
    rerender(<ProductCard product={{ ...products[0], imageUrl: "/images/new.jpg" }} />);
    expect(screen.getByRole("img")).toHaveAttribute("src", "/images/new.jpg");
  });
});
