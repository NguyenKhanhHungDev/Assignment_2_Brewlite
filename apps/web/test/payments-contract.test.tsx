import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PaymentCountdown from "@/components/PaymentCountdown";
import {
  parseOrderId,
  parsePaymentLink,
  parsePaymentOrder,
  parsePaymentStatus,
  paymentView,
} from "@/lib/payments";

const baseStatus = {
  orderId: 123,
  orderStatus: "PENDING",
  latestPayment: {
    paymentId: 456,
    provider: "ZALOPAY",
    transactionRef: "sandbox-reference",
    amount: 70000,
    status: "PENDING",
    paidAt: null,
  },
};

describe("Payments API response contract", () => {
  it.each([null, "", "0", "-1", "1.5", "1e2", "01", "123?status=SUCCESS", "2147483648"])(
    "rejects invalid orderId %s",
    (input) => {
      expect(parseOrderId(input)).toBeNull();
    },
  );

  it("parses valid positive integer orderId", () => {
    expect(parseOrderId("123")).toBe(123);
  });

  it("maps order and payment statuses to coherent payment views", () => {
    expect(paymentView(parsePaymentStatus(baseStatus, 123))).toBe("pending");
    expect(
      paymentView(parsePaymentStatus({ ...baseStatus, latestPayment: null }, 123)),
    ).toBe("pending");
    expect(
      paymentView(
        parsePaymentStatus(
          {
            ...baseStatus,
            orderStatus: "PAID",
            latestPayment: { ...baseStatus.latestPayment, status: "SUCCESS" },
          },
          123,
        ),
      ),
    ).toBe("success");
    expect(
      paymentView(parsePaymentStatus({ ...baseStatus, orderStatus: "CANCELLED" }, 123)),
    ).toBe("cancelled");
    expect(
      paymentView(
        parsePaymentStatus({ ...baseStatus, orderStatus: "PAYMENT_FAILED" }, 123),
      ),
    ).toBe("failed");

    for (const orderStatus of ["PENDING", "CANCELLED"]) {
      expect(
        paymentView(
          parsePaymentStatus(
            {
              ...baseStatus,
              orderStatus,
              latestPayment: { ...baseStatus.latestPayment, status: "SUCCESS" },
            },
            123,
          ),
        ),
      ).toBe("reconciliation");
    }

    expect(
      paymentView(
        parsePaymentStatus({ ...baseStatus, orderStatus: "PAID", latestPayment: null }, 123),
      ),
    ).toBe("reconciliation");
    expect(
      paymentView(
        parsePaymentStatus(
          {
            ...baseStatus,
            latestPayment: {
              ...baseStatus.latestPayment,
              status: "RECONCILIATION_REQUIRED",
            },
          },
          123,
        ),
      ),
    ).toBe("reconciliation");
  });

  it("rejects mismatched orderId or malformed status payloads", () => {
    expect(() => parsePaymentStatus({ ...baseStatus, orderId: 124 }, 123)).toThrow();
    expect(() =>
      parsePaymentStatus({ ...baseStatus, orderStatus: "UNKNOWN" }, 123),
    ).toThrow();

    for (const invalid of [
      { amount: -1 },
      { paymentId: "456" },
      { status: "UNKNOWN" },
      { paidAt: "invalid-date" },
    ]) {
      expect(() =>
        parsePaymentStatus(
          { ...baseStatus, latestPayment: { ...baseStatus.latestPayment, ...invalid } },
          123,
        ),
      ).toThrow();
    }
  });

  it("validates ZaloPay gateway URLs strictly", () => {
    const link = {
      orderId: 123,
      paymentId: 456,
      paymentUrl: "https://sbgateway.zalopay.vn/order?token=test",
    };
    expect(parsePaymentLink(link, 123).paymentUrl).toBe(link.paymentUrl);

    for (const paymentUrl of [
      "javascript:alert(1)",
      "/checkout",
      "http://sbgateway.zalopay.vn/order",
      "https://zalopay.vn.evil.invalid",
      "https://example.invalid",
      "https://user:password@sbgateway.zalopay.vn",
      "https://sbgateway.zalopay.vn:8443/order",
    ]) {
      expect(() => parsePaymentLink({ ...link, paymentUrl }, 123)).toThrow();
    }
    expect(() => parsePaymentLink(link, 124)).toThrow();
  });

  it("validates order snapshot payload", () => {
    const order = {
      id: 123,
      total: 70000,
      items: [
        {
          recipeName: "Tên tại lúc đặt",
          quantity: 2,
          size: "M",
          toppings: [],
          unitPrice: 35000,
          subtotal: 70000,
        },
      ],
    };
    expect(parsePaymentOrder(order, 123).items[0].name).toBe("Tên tại lúc đặt");
    expect(() => parsePaymentOrder(order, 124)).toThrow();
    expect(() =>
      parsePaymentOrder({ ...order, items: [{ ...order.items[0], quantity: 0 }] }, 123),
    ).toThrow();
  });
});

describe("PaymentCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-13T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders remaining timer for pending orders", () => {
    render(<PaymentCountdown expiresAt="2026-11-13T10:15:00.000Z" isPending />);
    expect(screen.getByRole("timer")).toHaveTextContent("15:00");
    expect(screen.getByText("Được giữ trong 15 phút tại quầy")).toBeInTheDocument();
  });

  it("shows urgent warning below 3 minutes", () => {
    render(<PaymentCountdown expiresAt="2026-11-13T10:02:05.000Z" isPending />);
    expect(screen.getByRole("timer")).toHaveTextContent("02:05");
    expect(screen.getByText("Sắp hết hạn! Vui lòng thanh toán sớm")).toBeInTheDocument();
  });

  it("shows expired state when deadline has passed and hides when not pending", () => {
    const { rerender } = render(
      <PaymentCountdown expiresAt="2026-11-13T09:59:00.000Z" isPending />,
    );
    expect(screen.getByText("Đơn hàng đã hết hạn thanh toán")).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveTextContent("00:00");

    rerender(
      <PaymentCountdown expiresAt="2026-11-13T10:15:00.000Z" isPending={false} />,
    );
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  });
});
