import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OrdersManager from "@/components/admin/orders/OrdersManager";
import AdminShell from "@/components/admin/AdminShell";
import { ApiError } from "@/lib/api";
import type { AdminOrder } from "@/lib/admin-orders";

const auth = vi.hoisted(() => ({
  request: vi.fn(),
  session: { userId: 7, expiresAt: Date.now() + 3600000 },
  loading: false,
  logout: vi.fn(),
}));
vi.mock("@/components/AuthProvider", () => ({ useAuth: () => auth }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/orders",
  useRouter: () => ({ replace: vi.fn() }),
}));
function order(
  status: AdminOrder["status"] = "PAID",
  paymentStatus: string | null = "SUCCESS",
): AdminOrder {
  return {
    id: 12,
    status,
    total: 70000,
    createdAt: "2026-11-13T02:00:00.000Z",
    expiresAt: "2026-11-13T02:15:00.000Z",
    userEmail: "customer@example.test",
    recipientName: "Khách nhận",
    paymentStatus,
    items: [
      {
        productId: 1,
        recipeName: "Trà sữa",
        quantity: 2,
        size: "M",
        toppings: ["PEARL"],
        sugarLevel: 50,
        iceLevel: "LESS",
        note: "Để riêng topping",
        unitPrice: 35000,
        subtotal: 70000,
      },
    ],
  };
}
function list(value: AdminOrder[], page = 1, total = value.length) {
  return {
    data: value,
    page,
    limit: 20,
    total,
    totalPages: Math.ceil(total / 20),
  };
}
let current: AdminOrder;
beforeEach(() => {
  current = order();
  auth.request.mockReset();
  auth.request.mockImplementation(async (path: string, init?: RequestInit) => {
    if (init?.method === "PATCH") {
      current = { ...current, status: JSON.parse(String(init.body)).status };
      return { orderId: current.id, status: current.status };
    }
    if (init?.method === "POST") {
      current = {
        ...current,
        status: "CANCELLED",
        cancellationReason: JSON.parse(String(init.body)).reason,
        cancelledAt: "2026-11-13T03:00:00.000Z",
        cancelledById: 7,
      };
      return { id: current.id, status: "CANCELLED" };
    }
    return path.includes("?")
      ? list(
          [current],
          Number(new URLSearchParams(path.split("?")[1]).get("page")),
        )
      : current;
  });
  vi.spyOn(window, "confirm").mockReturnValue(true);
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });
});
async function openDetail() {
  await userEvent.click(
    await screen.findByRole("button", { name: "Chi tiết đơn #12" }),
  );
  const dialog = screen.getByRole("dialog");
  await within(dialog).findByText("Để riêng topping");
  return dialog;
}
function writes() {
  return auth.request.mock.calls.filter(([, init]) => init?.method);
}

describe("Admin Orders UI", () => {
  it("lists customer, recipient, time, amount and statuses using the real list contract", async () => {
    render(<OrdersManager />);
    await screen.findByRole("button", { name: "Chi tiết đơn #12" });
    expect(auth.request).toHaveBeenCalledWith("/admin/orders?page=1&limit=20");
    expect(
      screen.getByRole("cell", { name: "customer@example.test" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("cell", { name: "Khách nhận" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Đã thanh toán").length).toBeGreaterThan(0);
    expect(screen.getByText(/1 đơn phù hợp/)).toBeInTheDocument();
  });

  it("applies search/status/payment/Vietnam dates on the server and resets paging", async () => {
    auth.request.mockImplementation(async (path: string) =>
      list(
        [current],
        Number(new URLSearchParams(path.split("?")[1]).get("page")),
        21,
      ),
    );
    render(<OrdersManager />);
    await screen.findByRole("button", { name: "Chi tiết đơn #12" });
    await userEvent.click(screen.getByRole("button", { name: "Trang sau" }));
    await waitFor(() =>
      expect(auth.request).toHaveBeenCalledWith(
        "/admin/orders?page=2&limit=20",
      ),
    );
    await userEvent.type(screen.getByLabelText("Tìm đơn hàng"), " Khách nhận ");
    await userEvent.selectOptions(
      screen.getByLabelText("Trạng thái đơn"),
      "PENDING",
    );
    await userEvent.selectOptions(
      screen.getByLabelText("Trạng thái thanh toán"),
      "NONE",
    );
    fireEvent.change(screen.getByLabelText("Từ ngày (Việt Nam)"), {
      target: { value: "2026-11-01" },
    });
    fireEvent.change(screen.getByLabelText("Đến ngày (Việt Nam)"), {
      target: { value: "2026-11-13" },
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Áp dụng bộ lọc" }),
    );
    await waitFor(() => {
      const path = auth.request.mock.calls.at(-1)![0];
      const query = new URLSearchParams(path.split("?")[1]);
      expect(Object.fromEntries(query)).toEqual({
        page: "1",
        limit: "20",
        search: "Khách nhận",
        status: "PENDING",
        paymentStatus: "NONE",
        dateFrom: "2026-11-01",
        dateTo: "2026-11-13",
      });
    });
    await userEvent.click(screen.getByRole("button", { name: "Xóa bộ lọc" }));
    await waitFor(() =>
      expect(auth.request.mock.calls.at(-1)![0]).toBe(
        "/admin/orders?page=1&limit=20",
      ),
    );
  });

  it("rejects reversed dates before sending a list request", async () => {
    render(<OrdersManager />);
    await screen.findByRole("button", { name: "Chi tiết đơn #12" });
    const count = auth.request.mock.calls.length;
    fireEvent.change(screen.getByLabelText("Từ ngày (Việt Nam)"), {
      target: { value: "2026-11-14" },
    });
    fireEvent.change(screen.getByLabelText("Đến ngày (Việt Nam)"), {
      target: { value: "2026-11-13" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Áp dụng bộ lọc" }).closest("form")!,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Ngày bắt đầu");
    expect(auth.request).toHaveBeenCalledTimes(count);
  });

  it("shows snapshot item options and only current status, never a fabricated timeline", async () => {
    render(<OrdersManager />);
    const dialog = await openDetail();
    expect(within(dialog).getByText("Trà sữa")).toBeInTheDocument();
    expect(within(dialog).getByText(/Size M.*Trân châu/)).toBeInTheDocument();
    expect(within(dialog).getByText(/50% đường.*Ít đá/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Trạng thái hiện tại/)).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Đang hiển thị trạng thái hiện tại/),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("option", { name: "Đã thanh toán" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["PAID", "PREPARING", "Đang pha chế"],
    ["PREPARING", "READY", "Sẵn sàng nhận tại quầy"],
    ["READY", "COMPLETED", "Hoàn tất"],
  ] as const)(
    "allows only the next preparation milestone %s -> %s, then reloads",
    async (from, to, label) => {
      current = order(from);
      render(<OrdersManager />);
      const dialog = await openDetail();
      await userEvent.click(
        within(dialog).getByRole("button", { name: `Chuyển sang ${label}` }),
      );
      expect(window.confirm).toHaveBeenCalled();
      await waitFor(() => expect(writes()).toHaveLength(1));
      expect(writes()[0][0]).toBe("/admin/orders/12/status");
      expect(writes()[0][1].method).toBe("PATCH");
      expect(JSON.parse(String(writes()[0][1].body))).toEqual({ status: to });
      await within(dialog).findByText("Đã cập nhật trạng thái đơn từ máy chủ.");
      expect(
        auth.request.mock.calls.filter(([path]) => path === "/admin/orders/12")
          .length,
      ).toBeGreaterThan(1);
    },
  );

  it.each(["PENDING", "PAYMENT_FAILED", "CANCELLED", "COMPLETED"] as const)(
    "never exposes preparation updates or manual PAID for %s",
    async (status) => {
      current = order(status, null);
      render(<OrdersManager />);
      const dialog = await openDetail();
      expect(
        within(dialog).queryByRole("button", { name: /^Chuyển sang/ }),
      ).not.toBeInTheDocument();
      expect(
        within(dialog).queryByRole("button", { name: /đánh dấu.*thanh toán/i }),
      ).not.toBeInTheDocument();
    },
  );

  it("does not write if the administrator rejects confirmation", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    render(<OrdersManager />);
    const dialog = await openDetail();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Chuyển sang Đang pha chế" }),
    );
    expect(writes()).toHaveLength(0);
  });

  it("cancels eligible pending orders with a trimmed reason and reloads audit fields", async () => {
    current = order("PENDING", null);
    render(<OrdersManager />);
    const dialog = await openDetail();
    await userEvent.type(
      within(dialog).getByLabelText("Lý do hủy"),
      "  Khách yêu cầu  ",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Xác nhận yêu cầu hủy" }),
    );
    await within(dialog).findByText("Đã hủy đơn theo xác nhận của máy chủ.");
    expect(writes()[0][0]).toBe("/admin/orders/12/cancel");
    expect(JSON.parse(String(writes()[0][1].body))).toEqual({
      reason: "Khách yêu cầu",
    });
    expect(within(dialog).getByText("Khách yêu cầu")).toBeInTheDocument();
    expect(within(dialog).getByText(/Admin #7/)).toBeInTheDocument();
  });

  it("validates cancellation reason length/whitespace without writing", async () => {
    current = order("PAYMENT_FAILED", "FAILED");
    render(<OrdersManager />);
    const dialog = await openDetail();
    fireEvent.change(within(dialog).getByLabelText("Lý do hủy"), {
      target: { value: " ".repeat(5) },
    });
    fireEvent.submit(
      within(dialog)
        .getByRole("button", { name: "Xác nhận yêu cầu hủy" })
        .closest("form")!,
    );
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "1 đến 300",
    );
    fireEvent.change(within(dialog).getByLabelText("Lý do hủy"), {
      target: { value: "a".repeat(301) },
    });
    fireEvent.submit(
      within(dialog)
        .getByRole("button", { name: "Xác nhận yêu cầu hủy" })
        .closest("form")!,
    );
    expect(writes()).toHaveLength(0);
  });

  it.each(["PENDING", "SUCCESS", "RECONCILIATION_REQUIRED"])(
    "blocks cancellation when latest payment is %s",
    async (paymentStatus) => {
      current = order("PENDING", paymentStatus);
      render(<OrdersManager />);
      const dialog = await openDetail();
      expect(
        within(dialog).queryByRole("button", { name: "Xác nhận yêu cầu hủy" }),
      ).not.toBeInTheDocument();
      expect(
        within(dialog).getByText(/chưa rõ|đối soát|thành công/, {
          selector: "p.bl-alert",
        }),
      ).toBeInTheDocument();
    },
  );

  it("shows conflict, refreshes current data and does not claim success", async () => {
    auth.request.mockImplementation(
      async (path: string, init?: RequestInit) => {
        if (init?.method) {
          current = order("READY");
          throw new ApiError("Trạng thái đơn hàng đã thay đổi", 409);
        }
        return path.includes("?") ? list([current]) : current;
      },
    );
    render(<OrdersManager />);
    const dialog = await openDetail();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Chuyển sang Đang pha chế" }),
    );
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "đã thay đổi",
    );
    await within(dialog).findByRole("button", { name: "Chuyển sang Hoàn tất" });
    expect(
      within(dialog).queryByText("Đã cập nhật trạng thái đơn từ máy chủ."),
    ).not.toBeInTheDocument();
  });

  it("keeps uncertain network results from becoming fake success and guards duplicate submission", async () => {
    let reject!: (value: unknown) => void;
    auth.request.mockImplementation(
      async (path: string, init?: RequestInit) => {
        if (init?.method)
          return new Promise((_resolve, fail) => {
            reject = fail;
          });
        return path.includes("?") ? list([current]) : current;
      },
    );
    render(<OrdersManager />);
    const dialog = await openDetail();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Chuyển sang Đang pha chế" }),
    );
    expect(
      within(dialog).getByRole("button", { name: "Đang cập nhật…" }),
    ).toBeDisabled();
    expect(
      within(dialog).queryByText("Đã cập nhật trạng thái đơn từ máy chủ."),
    ).not.toBeInTheDocument();
    expect(writes()).toHaveLength(1);
    reject(new Error("Mất kết nối"));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Mất kết nối",
    );
    expect(
      within(dialog).queryByText("Đã cập nhật trạng thái đơn từ máy chủ."),
    ).not.toBeInTheDocument();
  });

  it.each([401, 403])(
    "removes protected detail/list when mutation returns %s",
    async (status) => {
      auth.request.mockImplementation(
        async (path: string, init?: RequestInit) => {
          if (init?.method) throw new ApiError("Access denied", status);
          return path.includes("?") ? list([current]) : current;
        },
      );
      render(<OrdersManager />);
      const dialog = await openDetail();
      await userEvent.click(
        within(dialog).getByRole("button", {
          name: "Chuyển sang Đang pha chế",
        }),
      );
      expect(await screen.findByRole("alert")).toHaveTextContent(
        status === 401 ? /đăng nhập/ : /quyền/,
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(
        screen.queryByText("customer@example.test"),
      ).not.toBeInTheDocument();
    },
  );

  it("recovers a failed list and displays an empty result", async () => {
    auth.request
      .mockRejectedValueOnce(new Error("Mất kết nối"))
      .mockResolvedValue(list([]));
    render(<OrdersManager />);
    await screen.findByRole("alert");
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(
      await screen.findByText("Không có đơn hàng phù hợp bộ lọc."),
    ).toBeInTheDocument();
  });

  it("supports opening a linked order independently of the current list", async () => {
    render(<OrdersManager initialOrderId={12} />);
    const dialog = await screen.findByRole("dialog");
    expect(
      await within(dialog).findByText("Để riêng topping"),
    ).toBeInTheDocument();
    expect(auth.request).toHaveBeenCalledWith("/admin/orders/12");
  });

  it("AdminShell refuses CUSTOMER before mounting the orders screen", async () => {
    auth.request.mockResolvedValue({ id: 7, role: "CUSTOMER" });
    render(
      <AdminShell>
        <OrdersManager />
      </AdminShell>,
    );
    expect(
      await screen.findByRole("heading", { name: /403/ }),
    ).toBeInTheDocument();
    expect(auth.request).not.toHaveBeenCalledWith(
      "/admin/orders?page=1&limit=20",
    );
  });
  it("does not claim success for a malformed mutation acknowledgement", async () => {
    auth.request.mockImplementation(
      async (path: string, init?: RequestInit) => {
        if (init?.method) return { orderId: 999, status: "PREPARING" };
        return path.includes("?") ? list([current]) : current;
      },
    );
    render(<OrdersManager />);
    const dialog = await openDetail();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Chuyển sang Đang pha chế" }),
    );
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Chưa xác nhận",
    );
    expect(
      within(dialog).queryByText("Đã cập nhật trạng thái đơn từ máy chủ."),
    ).not.toBeInTheDocument();
  });

  it("does not claim success or allow another write when acknowledged update cannot be refreshed", async () => {
    let updated = false;
    auth.request.mockImplementation(
      async (path: string, init?: RequestInit) => {
        if (init?.method) {
          updated = true;
          return { orderId: 12, status: "PREPARING" };
        }
        if (updated && !path.includes("?"))
          throw new Error("Không tải được dữ liệu mới");
        return path.includes("?") ? list([current]) : current;
      },
    );
    render(<OrdersManager />);
    const dialog = await openDetail();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Chuyển sang Đang pha chế" }),
    );
    await waitFor(() =>
      expect(
        within(dialog)
          .getAllByRole("alert")
          .map((node) => node.textContent)
          .join(" "),
      ).toContain("chưa tải lại được chi tiết"),
    );
    expect(
      within(dialog).queryByRole("button", { name: /^Chuyển sang/ }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByText("Đã cập nhật trạng thái đơn từ máy chủ."),
    ).not.toBeInTheDocument();
    expect(writes()).toHaveLength(1);
  });

  it("refreshes cancellation eligibility on backend 409 without pretending to cancel", async () => {
    current = order("PAYMENT_FAILED", "FAILED");
    auth.request.mockImplementation(
      async (path: string, init?: RequestInit) => {
        if (init?.method) {
          current = order("PENDING", "RECONCILIATION_REQUIRED");
          throw new ApiError("Giao dịch chưa rõ kết quả", 409);
        }
        return path.includes("?") ? list([current]) : current;
      },
    );
    render(<OrdersManager />);
    const dialog = await openDetail();
    await userEvent.type(
      within(dialog).getByLabelText("Lý do hủy"),
      "Khách yêu cầu",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Xác nhận yêu cầu hủy" }),
    );
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "chưa rõ",
    );
    await waitFor(() =>
      expect(
        within(dialog).queryByLabelText("Lý do hủy"),
      ).not.toBeInTheDocument(),
    );
    expect(
      within(dialog).queryByText("Đã hủy đơn theo xác nhận của máy chủ."),
    ).not.toBeInTheDocument();
  });

  it.each([401, 403])(
    "does not expose protected order rows after list denial %s",
    async (status) => {
      auth.request.mockRejectedValue(new ApiError("Denied", status));
      render(<OrdersManager />);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        status === 401 ? /đăng nhập/ : /quyền/,
      );
      expect(
        screen.queryByRole("button", { name: "Chi tiết đơn #12" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Xuất CSV trang đang xem" }),
      ).toBeDisabled();
    },
  );

  it("handles missing detail and retries independently of the list", async () => {
    let failed = false;
    auth.request.mockImplementation(async (path: string) => {
      if (path.includes("?")) return list([current]);
      if (!failed) {
        failed = true;
        throw new ApiError("Missing", 404);
      }
      return current;
    });
    render(<OrdersManager />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Chi tiết đơn #12" }),
    );
    const dialog = screen.getByRole("dialog");
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Không tìm thấy",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Tải lại chi tiết" }),
    );
    expect(
      await within(dialog).findByText("Để riêng topping"),
    ).toBeInTheDocument();
  });

  it("ignores a late response after closing the detail and supports keyboard focus restore", async () => {
    let finish!: (value: unknown) => void;
    auth.request.mockImplementation(async (path: string) =>
      path.includes("?")
        ? list([current])
        : new Promise((resolve) => {
            finish = resolve;
          }),
    );
    render(<OrdersManager />);
    const button = await screen.findByRole("button", {
      name: "Chi tiết đơn #12",
    });
    await userEvent.click(button);
    const dialog = screen.getByRole("dialog");
    fireEvent(dialog, new Event("cancel", { bubbles: true, cancelable: true }));
    finish(current);
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(button).toHaveFocus();
  });
  it("restores focus to the refreshed row after a successful mutation", async () => {
    render(<OrdersManager />);
    const dialog = await openDetail();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Chuyển sang Đang pha chế" }),
    );
    await within(dialog).findByText("Đã cập nhật trạng thái đơn từ máy chủ.");
    await screen.findByRole("button", { name: "Chi tiết đơn #12" });
    fireEvent(dialog, new Event("cancel", { bubbles: true, cancelable: true }));
    expect(
      screen.getByRole("button", { name: "Chi tiết đơn #12" }),
    ).toHaveFocus();
  });
});
