import { describe, expect, it } from "vitest";
import { parseProducts } from "@/lib/products";
import { normalizeSearch } from "@/lib/menu";
import { products } from "./fixtures";

describe("Products API response contract", () => {
  it("accepts the menu contract and empty arrays", () => {
    expect(parseProducts(products)).toEqual(products);
    expect(parseProducts([])).toEqual([]);
  });
  it.each([
    { ...products[0], id: 0 },
    { ...products[0], name: "   " },
    { ...products[0], price: -1 },
    { ...products[0], stock: -1 },
    { ...products[0], category: "UNKNOWN" },
    { ...products[0], stockBySize: { S: 1, M: 2 } },
    { ...products[0], stockBySize: { S: 1, M: -1, L: 2 } },
  ])("rejects a malformed product: %j", product => {
    expect(() => parseProducts([product])).toThrow();
  });
  it("rejects duplicate IDs and responses that are not arrays", () => {
    expect(() => parseProducts([products[0], products[0]])).toThrow();
    expect(() => parseProducts({ products })).toThrow();
  });
  it("supports legacy responses without category or size stock", () => {
    expect(parseProducts([{ id: 8, name: "Cacao", price: 39000, imageUrl: "", stock: 0 }]))
      .toEqual([{ id: 8, name: "Cacao", price: 39000, imageUrl: "", stock: 0, category: "OTHER" }]);
  });
  it("normalizes Vietnamese search text, including đ", () => {
    expect(normalizeSearch("  CÀ   PHÊ ĐEN ĐÁ  ")).toBe("ca phe den da");
  });
});
