import { describe, expect, it } from "vitest";
import { money, sizeDelta, sizePrice, toppingPrice, unitPrice } from "@/lib/pricing";
import { iceOptions, parsePreferences, sugarOptions } from "@/lib/preferences";
import { addCartLine, cartKey, cartTotal } from "@/lib/cart";
import { products } from "./fixtures";

describe("Pricing logic (FR-04, 5.1.1b)", () => {
  it("calculates unit prices correctly for size S, M, L", () => {
    const base = 35000;
    expect(unitPrice(base, "M", [])).toBe(35000);
    expect(unitPrice(base, "S", [])).toBe(35000 + sizeDelta.S); // 30000
    expect(unitPrice(base, "L", [])).toBe(35000 + sizeDelta.L); // 40000
  });

  it("calculates toppings prices correctly", () => {
    const base = 35000;
    expect(unitPrice(base, "M", ["PEARL"])).toBe(35000 + toppingPrice.PEARL);
    expect(unitPrice(base, "M", ["CREAM"])).toBe(35000 + toppingPrice.CREAM);
    expect(unitPrice(base, "M", ["PEARL", "CREAM"])).toBe(
      35000 + toppingPrice.PEARL + toppingPrice.CREAM,
    );
  });

  it("formats money to Vietnamese currency format", () => {
    expect(money(35000)).toBe("35.000 VND");
  });

  it("rejects invalid inputs safely", () => {
    expect(() => unitPrice(-1000, "M", [])).toThrow();
    // @ts-expect-error invalid size
    expect(() => unitPrice(35000, "XL", [])).toThrow();
    expect(sizePrice(35000, "M")).toBe(35000);
  });
});

describe("Preferences validation (FR-03, 5.1.1b)", () => {
  it("validates sugar and ice options", () => {
    expect(sugarOptions.map((o) => o.value)).toEqual([0, 50, 100]);
    expect(iceOptions.map((o) => o.value)).toEqual(["NONE", "LESS", "NORMAL"]);

    const valid = parsePreferences({ sugarLevel: 50, iceLevel: "LESS", note: "ít ngọt" });
    expect(valid.sugarLevel).toBe(50);
    expect(valid.iceLevel).toBe("LESS");
    expect(valid.note).toBe("ít ngọt");
  });

  it("rejects note exceeding 200 characters", () => {
    const longNote = "a".repeat(201);
    expect(() => parsePreferences({ note: longNote })).toThrow();
  });
});

describe("Cart and line items for product detail", () => {
  it("creates deterministic cart keys with and without preferences", () => {
    const keyDefault = cartKey(1, "M", []);
    expect(keyDefault).toBe("1:M:");

    const keyCustom = cartKey(1, "M", ["PEARL"], { sugarLevel: 50, iceLevel: "LESS", note: "nóng" });
    expect(keyCustom).toContain("1:M:PEARL");
    expect(keyCustom).toContain("50");
  });

  it("adds lines and validates stock and quantity constraints", () => {
    let lines = addCartLine([], products[0], "M", [], 2);
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(2);
    expect(cartTotal(lines)).toBe(70000);

    // Stock for product 0 size M is 8. Adding 6 more brings total to 8.
    lines = addCartLine(lines, products[0], "M", [], 6);
    expect(lines[0].quantity).toBe(8);

    // Adding 1 more exceeds stock (8) -> throws error
    expect(() => addCartLine(lines, products[0], "M", [], 1)).toThrow(/vượt 8/);
  });
});
