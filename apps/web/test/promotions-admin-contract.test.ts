import { describe, expect, it } from "vitest";
import { normalizePromo, parsePromoCode, previewPromotion } from "@/lib/promotion";
import { parseRecipes } from "@/lib/recipes";

describe("Promotions BREW10 logic (FR-13, 5.1.7)", () => {
  it("normalizes promo codes properly (case-insensitive, trims)", () => {
    expect(normalizePromo("  brew10  ")).toBe("BREW10");
    expect(normalizePromo("Brew10")).toBe("BREW10");
  });

  it("calculates 10% discount for BREW10 code correctly", () => {
    const result = previewPromotion(100000, "BREW10");
    expect(result.subtotal).toBe(100000);
    expect(result.discount).toBe(10000);
    expect(result.payable).toBe(90000);

    const resultOdd = previewPromotion(35000, "brew10");
    expect(resultOdd.discount).toBe(3500);
    expect(resultOdd.payable).toBe(31500);
  });

  it("applies 0 discount when code is omitted or empty", () => {
    const result = previewPromotion(50000, undefined);
    expect(result.discount).toBe(0);
    expect(result.payable).toBe(50000);
  });

  it("rejects unknown promo codes", () => {
    expect(() => previewPromotion(50000, "SALE50")).toThrow(/không hợp lệ/);
    expect(() => previewPromotion(-10, "BREW10")).toThrow();
  });

  it("parses valid promo code and validates length", () => {
    expect(parsePromoCode("brew10")).toBe("BREW10");
    expect(parsePromoCode(undefined)).toBeUndefined();
    expect(() => parsePromoCode("")).toThrow();
    expect(() => parsePromoCode("a".repeat(65))).toThrow();
  });
});

describe("Admin recipes parsing and validation (FR-27, FR-31, 5.1.7)", () => {
  it("parses valid recipes list including ingredients", () => {
    const raw = [
      {
        id: 1,
        name: "Cà phê sữa đá",
        price: 35000,
        imageUrl: "/images/products/ca-phe-sua.jpg",
        isActive: true,
        category: "COFFEE",
        ingredients: [
          { ingredientId: 10, name: "Cà phê Robusta", unit: "g", quantity: 25 },
          { ingredientId: 11, name: "Sữa đặc", unit: "ml", quantity: 30 },
        ],
      },
    ];

    const recipes = parseRecipes(raw);
    expect(recipes).toHaveLength(1);
    expect(recipes[0].name).toBe("Cà phê sữa đá");
    expect(recipes[0].category).toBe("COFFEE");
    expect(recipes[0].ingredients).toHaveLength(2);
  });

  it("rejects invalid recipe data", () => {
    expect(() => parseRecipes("not-an-array")).toThrow();
    // Missing required fields
    expect(() => parseRecipes([{ id: 1, name: "Test" }])).toThrow();
    // Duplicate recipe id
    expect(() =>
      parseRecipes([
        {
          id: 1,
          name: "Món 1",
          price: 30000,
          imageUrl: "/a.jpg",
          isActive: true,
          category: "COFFEE",
          ingredients: [{ ingredientId: 1, name: "Ing", unit: "g", quantity: 10 }],
        },
        {
          id: 1,
          name: "Món 2",
          price: 35000,
          imageUrl: "/b.jpg",
          isActive: true,
          category: "TEA",
          ingredients: [{ ingredientId: 2, name: "Ing 2", unit: "g", quantity: 10 }],
        },
      ]),
    ).toThrow();
  });
});
