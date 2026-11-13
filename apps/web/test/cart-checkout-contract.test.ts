import { describe, expect, it } from "vitest";
import { addCartLine, cartKey, cartTotal, changeCartQuantity } from "@/lib/cart";
import { parseHistory, parseOrderResult } from "@/lib/orders";
import { parsePaymentLink, parsePaymentStatus, paymentView } from "@/lib/payments";
import { products } from "./fixtures";

describe("Cart Operations (FR-10, FR-11, 5.1.2)", () => {
  it("splits lines when preferences (ice/sugar/notes) differ", () => {
    let lines = addCartLine([], products[0], "M", [], 1, { sugarLevel: 100, iceLevel: "NORMAL" });
    lines = addCartLine(lines, products[0], "M", [], 1, { sugarLevel: 50, iceLevel: "LESS" });
    expect(lines).toHaveLength(2);
    expect(lines[0].sugarLevel).toBe(100);
    expect(lines[1].sugarLevel).toBe(50);
  });

  it("merges quantities when preferences and options are identical", () => {
    let lines = addCartLine([], products[0], "M", ["PEARL"], 2, { sugarLevel: 100 });
    lines = addCartLine(lines, products[0], "M", ["PEARL"], 3, { sugarLevel: 100 });
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(5);
    expect(cartTotal(lines)).toBe(lines[0].quantity * (35000 + 5000));
  });

  it("updates line quantity properly", () => {
    let lines = addCartLine([], products[0], "M", [], 2);
    const key = cartKey(products[0].id, "M", []);
    lines = changeCartQuantity(lines, key, 4);
    expect(lines[0].quantity).toBe(4);
  });
});

describe("Order and Checkout Validation (FR-12, FR-15, FR-18, 5.1.2)", () => {
  it("parses valid order result", () => {
    const raw = {
      orderId: 101,
      total: 70000,
      status: "PENDING",
    };
    const order = parseOrderResult(raw);
    expect(order.orderId).toBe(101);
    expect(order.total).toBe(70000);
    expect(order.status).toBe("PENDING");
  });

  it("parses order history list", () => {
    const rawHistory = [
      {
        id: 1,
        status: "COMPLETED",
        total: 35000,
        createdAt: new Date().toISOString(),
        items: [
          {
            productId: 1,
            recipeName: "Cà phê sữa",
            size: "M",
            quantity: 1,
            unitPrice: 35000,
            subtotal: 35000,
            toppings: [],
          },
        ],
      },
    ];
    const history = parseHistory(rawHistory);
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe(1);
    expect(history[0].items[0].recipeName).toBe("Cà phê sữa");
  });

  it("handles payment statuses and views correctly", () => {
    const pendingRaw = {
      orderId: 101,
      orderStatus: "PENDING",
      latestPayment: null,
    };
    const parsedPending = parsePaymentStatus(pendingRaw, 101);
    expect(paymentView(parsedPending)).toBe("pending");

    const successRaw = {
      orderId: 101,
      orderStatus: "PAID",
      latestPayment: {
        paymentId: 1,
        provider: "ZALOPAY",
        transactionRef: "ref123",
        amount: 35000,
        status: "SUCCESS",
        paidAt: new Date().toISOString(),
      },
    };
    const parsedSuccess = parsePaymentStatus(successRaw, 101);
    expect(paymentView(parsedSuccess)).toBe("success");
  });

  it("validates payment link response", () => {
    const linkRaw = {
      orderId: 101,
      paymentId: 1,
      paymentUrl: "https://sb-openapi.zalopay.vn/pay?token=xyz",
    };
    const link = parsePaymentLink(linkRaw, 101);
    expect(link.paymentUrl).toBe(linkRaw.paymentUrl);
    expect(link.orderId).toBe(101);
  });
});
