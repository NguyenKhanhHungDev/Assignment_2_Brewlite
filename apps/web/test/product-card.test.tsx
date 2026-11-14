import { fireEvent, render as renderComponent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import ProductCard from "@/components/ProductCard";
import MenuHero from "@/components/MenuHero";
import { MenuProviders } from "./menu-providers";
import { addCartLine } from "@/lib/cart";
import { products } from "./fixtures";

const render = (ui: ReactNode) => renderComponent(ui, { wrapper: MenuProviders });
beforeEach(() => localStorage.clear());

describe("ProductCard stock and image states", () => {
  it("links an available menu item to its customization page", () => {
    render(<ProductCard product={products[0]} />);
    expect(screen.getByRole("link", { name: products[0].name })).toHaveAttribute(
      "href",
      `/products/${products[0].id}`,
    );
  });
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

describe.each([
  ["product card", ProductCard],
  ["featured carousel", MenuHero],
])("%s quick add", (_name, Component) => {
  it("adds one size M without toppings and disables at the available stock", async () => {
    const user = userEvent.setup();
    render(<Component product={{ ...products[0], stock: 1, stockBySize: { S: 2, M: 1, L: 1 } }} />);
    const button = screen.getByRole("button", { name: /Thêm nhanh.*Cà phê sữa/ });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
    expect(JSON.parse(localStorage.getItem("brewlite-cart")!)).toMatchObject([
      { product: { id: 1 }, size: "M", toppings: [], quantity: 1 },
    ]);
    expect(screen.getByRole("status")).toHaveTextContent("Đã thêm Cà phê sữa");
    expect(button).toBeDisabled();
    expect(button.closest("a")).toBeNull();
  });

  it("keeps customization available when size M is sold out", async () => {
    render(<Component product={{ ...products[0], stock: 0, stockBySize: { S: 1, M: 0, L: 0 } }} />);
    await waitFor(() => expect(screen.getByTestId("cart-ready")).toHaveTextContent("true"));
    await waitFor(() => expect(screen.getByRole("button", { name: /Thêm nhanh/ })).toBeDisabled());
    expect(screen.getAllByRole("link").some(link => link.getAttribute("href") === "/products/1")).toBe(true);
    expect(localStorage.getItem("brewlite-cart")).toBeNull();
  });

  it("counts size M lines with different preferences before enabling quick add", async () => {
    localStorage.setItem("brewlite-cart", JSON.stringify(addCartLine([], products[0], "M", ["PEARL"], 8, { sugarLevel: 50 })));
    render(<Component product={products[0]} />);
    await waitFor(() => expect(screen.getByTestId("cart-ready")).toHaveTextContent("true"));
    const button = screen.getByRole("button", { name: /Thêm nhanh/ });
    await waitFor(() => expect(button).toBeDisabled());
    expect(JSON.parse(localStorage.getItem("brewlite-cart")!)[0].quantity).toBe(8);
  });

  it("does not exceed 99 cups in the quick-add line", async () => {
    const product = { ...products[0], stock: 200, stockBySize: { S: 200, M: 200, L: 200 } };
    localStorage.setItem("brewlite-cart", JSON.stringify(addCartLine([], product, "M", [], 99)));
    render(<Component product={product} />);
    await waitFor(() => expect(screen.getByTestId("cart-ready")).toHaveTextContent("true"));
    await waitFor(() => expect(screen.getByRole("button", { name: /Thêm nhanh/ })).toBeDisabled());
  });
});

it("links the product image and customization action to the same product", () => {
  render(<ProductCard product={products[0]} />);
  expect(screen.getByRole("link", { name: "Xem chi tiết Cà phê sữa" })).toHaveAttribute("href", "/products/1");
  expect(screen.getByRole("link", { name: "Tùy chọn cho Cà phê sữa" })).toHaveAttribute("href", "/products/1");
});

it("updates the carousel link and quick-add product after changing slides", async () => {
  const user = userEvent.setup();
  render(<MenuHero products={products.slice(0, 2)} />);
  expect(screen.getByRole("link", { name: "Khám phá món: Cà phê sữa" })).toHaveAttribute("href", "/products/1");
  await user.click(screen.getByRole("button", { name: "Món tiếp theo" }));
  expect(screen.getByRole("link", { name: "Khám phá món: Cà phê muối" })).toHaveAttribute("href", "/products/2");
  await user.click(screen.getByRole("button", { name: /Thêm nhanh.*Cà phê muối/ }));
  expect(JSON.parse(localStorage.getItem("brewlite-cart")!)).toMatchObject([{ product: { id: 2 }, quantity: 1 }]);
});
