import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminShell from "@/components/admin/AdminShell";
import IngredientsManager from "@/components/admin/ingredients/IngredientsManager";
import { ApiError } from "@/lib/api";
import { parseIngredients, parseInventoryHistory } from "@/lib/ingredients";

const auth = vi.hoisted(() => ({
  request: vi.fn(),
  session: { userId: 7, expiresAt: Date.now() + 3600000 },
  loading: false,
  logout: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/ingredients",
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("@/components/AuthProvider", () => ({ useAuth: () => auth }));
const tea = {
  id: 1,
  name: "Trà đen",
  unit: "g",
  stock: 100,
  reserved: 30,
  available: 70,
  minStock: 80,
  version: 4,
};
const milk = {
  id: 2,
  name: "Sữa tươi",
  unit: "ml",
  stock: 500,
  reserved: 0,
  available: 500,
  minStock: 50,
  version: 1,
};
const history = {
  data: [
    {
      id: 1,
      ingredientId: 1,
      kind: "RESTOCK",
      delta: 20,
      stockBefore: 80,
      stockAfter: 100,
      reason: "Nhập đầu ngày",
      createdAt: "2026-11-13T01:00:00.000Z",
      actor: { id: 7, name: "Admin", email: "admin@example.test" },
    },
  ],
  page: 1,
  limit: 20,
  total: 1,
  totalPages: 1,
};

beforeEach(() => {
  auth.request.mockReset();
  auth.request.mockImplementation(async (path: string, init?: RequestInit) => {
    if (path.includes("/movements")) return history;
    if (!init?.method) return [tea, milk];
    if (init.method === "DELETE") return { id: 1, deleted: true };
    return tea;
  });
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
async function openAction(action: string) {
  await screen.findByRole("cell", { name: "Trà đen" });
  const row = screen.getByRole("row", { name: /Trà đen/ });
  await userEvent.click(within(row).getByRole("button", { name: action }));
  return screen.getByRole("dialog");
}
function mutations() {
  return auth.request.mock.calls.filter(([, init]) => init?.method);
}

describe("Admin Inventory UI", () => {
  it("loads real request contract, searches without accents, filters and sorts", async () => {
    render(<IngredientsManager />);
    await screen.findByRole("cell", { name: "Trà đen" });
    expect(auth.request).toHaveBeenCalledWith("/ingredients");
    expect(screen.getAllByText("Tồn thấp").length).toBeGreaterThan(0);
    await userEvent.type(screen.getByLabelText("Tìm nguyên liệu"), "sua");
    expect(
      screen.queryByRole("cell", { name: "Trà đen" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Sữa tươi" })).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText("Tìm nguyên liệu"));
    await userEvent.selectOptions(
      screen.getByLabelText("Tình trạng kho"),
      "low",
    );
    expect(
      screen.queryByRole("cell", { name: "Sữa tươi" }),
    ).not.toBeInTheDocument();
    await userEvent.selectOptions(
      screen.getByLabelText("Tình trạng kho"),
      "all",
    );
    await userEvent.selectOptions(
      screen.getByLabelText("Sắp xếp"),
      "available-desc",
    );
    expect(screen.getAllByRole("row")[1]).toHaveTextContent("Sữa tươi");
  });

  it("keeps the same restock payload/key on retry and rejects duplicate in-flight submissions", async () => {
    let finish!: (value: unknown) => void;
    auth.request.mockImplementation(
      async (_path: string, init?: RequestInit) => {
        if (!init?.method) return [tea];
        if (mutations().length === 1) throw new Error("Mất kết nối");
        return new Promise((resolve) => {
          finish = resolve;
        });
      },
    );
    render(<IngredientsManager />);
    const dialog = await openAction("Nhập kho");
    await userEvent.type(
      within(dialog).getByLabelText("Số lượng nhập (g)"),
      "20",
    );
    await userEvent.type(within(dialog).getByLabelText("Lý do"), "Nhập thêm");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Xác nhận nhập kho" }),
    );
    await within(dialog).findByRole("alert");
    expect(within(dialog).getByLabelText("Lý do")).toBeDisabled();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Thử lại cùng thao tác" }),
    );
    fireEvent.submit(
      within(dialog)
        .getByRole("button", { name: "Đang xử lý…" })
        .closest("form")!,
    );
    expect(mutations()).toHaveLength(2);
    const first = mutations()[0][1],
      second = mutations()[1][1];
    expect(second.body).toBe(first.body);
    expect(new Headers(second.headers).get("Idempotency-Key")).toBe(
      new Headers(first.headers).get("Idempotency-Key"),
    );
    expect(new Headers(first.headers).get("Idempotency-Key")).toMatch(
      /^[a-zA-Z0-9._:-]{1,128}$/,
    );
    expect(JSON.parse(String(first.body))).toEqual({
      quantity: 20,
      reason: "Nhập thêm",
    });
    finish({ ...tea, stock: 120, available: 90, version: 5 });
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Đã nhập kho.")).toBeInTheDocument();
  });

  it("sends expectedVersion for adjustment, blocks stale retry, requires reload after 409", async () => {
    let fresh = false;
    auth.request.mockImplementation(
      async (_path: string, init?: RequestInit) => {
        if (!init?.method) return [{ ...tea, version: fresh ? 5 : 4 }];
        if (mutations().length === 1) {
          fresh = true;
          throw new ApiError("Tồn kho đã thay đổi", 409);
        }
        return { ...tea, stock: 90, available: 60, version: 6 };
      },
    );
    render(<IngredientsManager />);
    const dialog = await openAction("Kiểm kho");
    await userEvent.clear(
      within(dialog).getByLabelText("Tồn thực sau kiểm (g)"),
    );
    await userEvent.type(
      within(dialog).getByLabelText("Tồn thực sau kiểm (g)"),
      "90",
    );
    await userEvent.type(
      within(dialog).getByLabelText("Lý do"),
      "Kiểm cuối ngày",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Xác nhận kiểm kho" }),
    );
    await within(dialog).findByRole("alert");
    expect(JSON.parse(String(mutations()[0][1].body))).toEqual({
      stock: 90,
      expectedVersion: 4,
      reason: "Kiểm cuối ngày",
    });
    expect(
      within(dialog).getByRole("button", { name: "Xác nhận kiểm kho" }),
    ).toBeDisabled();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Tải lại nguyên liệu" }),
    );
    expect(within(dialog).getByLabelText("Tồn thực sau kiểm (g)")).toHaveValue(
      100,
    );
    await userEvent.clear(
      within(dialog).getByLabelText("Tồn thực sau kiểm (g)"),
    );
    await userEvent.type(
      within(dialog).getByLabelText("Tồn thực sau kiểm (g)"),
      "90",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Xác nhận kiểm kho" }),
    );
    await waitFor(() => expect(mutations()).toHaveLength(2));
    expect(JSON.parse(String(mutations()[1][1].body)).expectedVersion).toBe(5);
    expect(
      new Headers(mutations()[0][1].headers).get("Idempotency-Key"),
    ).not.toBe(new Headers(mutations()[1][1].headers).get("Idempotency-Key"));
  });

  it("validates adjustment below reserved and blank reason without sending requests", async () => {
    render(<IngredientsManager />);
    const dialog = await openAction("Kiểm kho");
    await userEvent.clear(
      within(dialog).getByLabelText("Tồn thực sau kiểm (g)"),
    );
    await userEvent.type(
      within(dialog).getByLabelText("Tồn thực sau kiểm (g)"),
      "20",
    );
    await userEvent.type(within(dialog).getByLabelText("Lý do"), "Kiểm lại");
    fireEvent.submit(
      within(dialog)
        .getByRole("button", { name: "Xác nhận kiểm kho" })
        .closest("form")!,
    );
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "đang giữ",
    );
    expect(mutations()).toHaveLength(0);
    await userEvent.clear(
      within(dialog).getByLabelText("Tồn thực sau kiểm (g)"),
    );
    await userEvent.type(
      within(dialog).getByLabelText("Tồn thực sau kiểm (g)"),
      "100",
    );
    await userEvent.clear(within(dialog).getByLabelText("Lý do"));
    await userEvent.type(within(dialog).getByLabelText("Lý do"), "   ");
    fireEvent.submit(
      within(dialog)
        .getByRole("button", { name: "Xác nhận kiểm kho" })
        .closest("form")!,
    );
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Nhập lý do từ 1 đến 300 ký tự",
    );
    expect(mutations()).toHaveLength(0);
  });

  it("creates and edits with supported fields only", async () => {
    render(<IngredientsManager />);
    await screen.findByRole("cell", { name: "Trà đen" });
    await userEvent.click(
      screen.getByRole("button", { name: "Thêm nguyên liệu" }),
    );
    let dialog = screen.getByRole("dialog");
    await userEvent.type(
      within(dialog).getByLabelText("Tên nguyên liệu"),
      " Cà phê ",
    );
    await userEvent.selectOptions(within(dialog).getByLabelText("Đơn vị"), "g");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Tạo nguyên liệu" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(mutations()[0][0]).toBe("/ingredients");
    expect(JSON.parse(String(mutations()[0][1].body))).toEqual({
      name: "Cà phê",
      unit: "g",
      stock: 0,
      minStock: 0,
    });
    dialog = await openAction("Sửa");
    expect(within(dialog).queryByLabelText("Đơn vị")).not.toBeInTheDocument();
    await userEvent.clear(within(dialog).getByLabelText("Ngưỡng tối thiểu"));
    await userEvent.type(
      within(dialog).getByLabelText("Ngưỡng tối thiểu"),
      "50",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Lưu thay đổi" }),
    );
    await waitFor(() => expect(mutations()).toHaveLength(2));
    expect(mutations()[1][1].method).toBe("PATCH");
    expect(JSON.parse(String(mutations()[1][1].body))).toEqual({
      name: "Trà đen",
      minStock: 50,
    });
  });

  it("shows paginated movement history with actor/reason", async () => {
    auth.request.mockImplementation(async (path: string) =>
      path.includes("/movements")
        ? {
            ...history,
            page: path.endsWith("=2") ? 2 : 1,
            total: 21,
            totalPages: 2,
          }
        : [tea],
    );
    render(<IngredientsManager />);
    const dialog = await openAction("Lịch sử");
    expect(
      await within(dialog).findByText("Nhập đầu ngày"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/admin@example.test/)).toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Trang sau" }),
    );
    await waitFor(() =>
      expect(auth.request).toHaveBeenCalledWith(
        "/ingredients/1/movements?page=2",
      ),
    );
  });

  it("requires delete confirmation, preserves data on a backend conflict", async () => {
    auth.request.mockImplementation(
      async (_path: string, init?: RequestInit) => {
        if (init?.method === "DELETE")
          throw new ApiError(
            "Nguyên liệu đã có lịch sử kho; không thể xóa.",
            409,
          );
        return [{ ...tea, reserved: 0, available: 100 }];
      },
    );
    render(<IngredientsManager />);
    const dialog = await openAction("Xóa");
    expect(mutations()).toHaveLength(0);
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Xác nhận xóa" }),
    );
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "không thể xóa",
    );
    expect(screen.getByRole("cell", { name: "Trà đen" })).toBeInTheDocument();
  });

  it.each([401, 403])(
    "blocks mutations when list access is denied (%s)",
    async (status) => {
      auth.request.mockRejectedValue(
        new ApiError("Không được truy cập", status),
      );
      render(<IngredientsManager />);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        status === 401 ? /đăng nhập/ : /quyền/,
      );
      expect(
        screen.getByRole("button", { name: "Thêm nguyên liệu" }),
      ).toBeDisabled();
      expect(mutations()).toHaveLength(0);
    },
  );

  it("recovers from list errors and displays empty data", async () => {
    auth.request
      .mockRejectedValueOnce(new Error("Mất kết nối"))
      .mockResolvedValue([]);
    render(<IngredientsManager />);
    await screen.findByRole("alert");
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(
      await screen.findByText(
        "Chưa có nguyên liệu. Hãy thêm nguyên liệu đầu tiên.",
      ),
    ).toBeInTheDocument();
  });
});

describe("Inventory edge cases and access", () => {
  it("keeps loading actions disabled and handles no search results", async () => {
    let finish!: (data: unknown) => void;
    auth.request.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(<IngredientsManager />);
    expect(screen.getByRole("status")).toHaveTextContent("Đang tải");
    expect(
      screen.getByRole("button", { name: "Thêm nguyên liệu" }),
    ).toBeDisabled();
    finish([tea]);
    await screen.findByRole("cell", { name: "Trà đen" });
    await userEvent.type(
      screen.getByLabelText("Tìm nguyên liệu"),
      "không tồn tại",
    );
    expect(
      screen.getByText("Không có nguyên liệu phù hợp bộ lọc."),
    ).toBeInTheDocument();
  });

  it("AdminShell rejects CUSTOMER before inventory is mounted", async () => {
    auth.request.mockResolvedValue({ id: 7, role: "CUSTOMER" });
    render(
      <AdminShell>
        <IngredientsManager />
      </AdminShell>,
    );
    expect(
      await screen.findByRole("heading", { name: /403/ }),
    ).toBeInTheDocument();
    expect(auth.request).toHaveBeenCalledWith("/auth/me");
    expect(auth.request).not.toHaveBeenCalledWith("/ingredients");
  });

  it.each([401, 403])(
    "hides protected data and closes the form on mutation denial %s",
    async (status) => {
      auth.request.mockImplementation(
        async (_path: string, init?: RequestInit) => {
          if (init?.method) throw new ApiError("Không được truy cập", status);
          return [tea];
        },
      );
      render(<IngredientsManager />);
      const dialog = await openAction("Sửa");
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Lưu thay đổi" }),
      );
      expect(await screen.findByRole("alert")).toHaveTextContent(
        status === 401 ? /đăng nhập/ : /quyền/,
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("cell", { name: "Trà đen" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Thêm nguyên liệu" }),
      ).toBeDisabled();
    },
  );

  it("shows 400 validation errors and permits correcting the same form", async () => {
    auth.request.mockImplementation(
      async (_path: string, init?: RequestInit) => {
        if (init?.method && mutations().length === 1)
          throw new ApiError("Số lượng nhập vượt giới hạn tồn kho.", 400);
        return init?.method ? tea : [tea];
      },
    );
    render(<IngredientsManager />);
    const dialog = await openAction("Nhập kho");
    await userEvent.type(
      within(dialog).getByLabelText("Số lượng nhập (g)"),
      "20",
    );
    await userEvent.type(within(dialog).getByLabelText("Lý do"), "Nhập hàng");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Xác nhận nhập kho" }),
    );
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "vượt giới hạn",
    );
    expect(within(dialog).getByLabelText("Lý do")).toBeEnabled();
    await userEvent.clear(within(dialog).getByLabelText("Số lượng nhập (g)"));
    await userEvent.type(
      within(dialog).getByLabelText("Số lượng nhập (g)"),
      "1",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Xác nhận nhập kho" }),
    );
    await waitFor(() => expect(mutations()).toHaveLength(2));
    expect(JSON.parse(String(mutations()[1][1].body)).quantity).toBe(1);
  });

  it("blocks resubmission after 404 until data is reloaded", async () => {
    auth.request.mockImplementation(
      async (_path: string, init?: RequestInit) => {
        if (init?.method) throw new ApiError("Gone", 404);
        return [tea];
      },
    );
    render(<IngredientsManager />);
    const dialog = await openAction("Sửa");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Lưu thay đổi" }),
    );
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Không tìm thấy",
    );
    expect(
      within(dialog).getByRole("button", { name: "Lưu thay đổi" }),
    ).toBeDisabled();
  });

  it("keeps expectedVersion and key unchanged when retrying an ambiguous adjustment", async () => {
    auth.request.mockImplementation(
      async (_path: string, init?: RequestInit) => {
        if (!init?.method) return [tea];
        if (mutations().length === 1) throw new ApiError("Tạm gián đoạn", 503);
        return tea;
      },
    );
    render(<IngredientsManager />);
    const dialog = await openAction("Kiểm kho");
    await userEvent.type(within(dialog).getByLabelText("Lý do"), "Đếm lại");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Xác nhận kiểm kho" }),
    );
    await within(dialog).findByRole("alert");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Thử lại cùng thao tác" }),
    );
    await waitFor(() => expect(mutations()).toHaveLength(2));
    expect(mutations()[1][1]).toEqual(mutations()[0][1]);
  });

  it("protects system topping names/deletion and missing stock versions", async () => {
    auth.request.mockResolvedValue([
      { ...tea, name: "Trân châu", version: undefined },
    ]);
    render(<IngredientsManager />);
    const row = await screen.findByRole("row", { name: /Trân châu/ });
    expect(within(row).getByRole("button", { name: "Xóa" })).toBeDisabled();
    expect(
      within(row).getByRole("button", { name: "Kiểm kho" }),
    ).toBeDisabled();
    await userEvent.click(within(row).getByRole("button", { name: "Sửa" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Tên nguyên liệu")).toBeDisabled();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Lưu thay đổi" }),
    );
    await waitFor(() => expect(mutations()).toHaveLength(1));
    expect(JSON.parse(String(mutations()[0][1].body))).toEqual({
      minStock: 80,
    });
  });

  it("deletes only after confirmation and reloads the list", async () => {
    auth.request.mockImplementation(
      async (_path: string, init?: RequestInit) =>
        init?.method === "DELETE"
          ? { id: 1, deleted: true }
          : mutations().length
            ? []
            : [{ ...tea, reserved: 0, available: 100 }],
    );
    render(<IngredientsManager />);
    const dialog = await openAction("Xóa");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Xác nhận xóa" }),
    );
    expect(await screen.findByText("Đã xóa nguyên liệu.")).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Chưa có nguyên liệu. Hãy thêm nguyên liệu đầu tiên.",
      ),
    ).toBeInTheDocument();
    expect(mutations()[0][0]).toBe("/ingredients/1");
  });

  it("offers retry on history errors and shows empty history", async () => {
    let failed = false;
    auth.request.mockImplementation(async (path: string) => {
      if (!path.includes("/movements")) return [tea];
      if (!failed) {
        failed = true;
        throw new Error("Mất kết nối lịch sử");
      }
      return { data: [], page: 1, limit: 20, total: 0, totalPages: 1 };
    });
    render(<IngredientsManager />);
    const dialog = await openAction("Lịch sử");
    await within(dialog).findByRole("alert");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Thử lại" }),
    );
    expect(
      await within(dialog).findByText("Chưa có lịch sử nhập hoặc kiểm kho."),
    ).toBeInTheDocument();
  });

  it("supports closing the dialog with Escape and restores focus", async () => {
    render(<IngredientsManager />);
    const dialog = await openAction("Sửa");
    fireEvent(dialog, new Event("cancel", { bubbles: true, cancelable: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      within(screen.getByRole("row", { name: /Trà đen/ })).getByRole("button", {
        name: "Sửa",
      }),
    ).toHaveFocus();
  });
});

describe("Inventory response contracts", () => {
  it("rejects inconsistent quantities/versions and malformed history", () => {
    expect(parseIngredients([tea])).toEqual([tea]);
    expect(() => parseIngredients([{ ...tea, available: 99 }])).toThrow();
    expect(() => parseIngredients([{ ...tea, version: -1 }])).toThrow();
    expect(parseInventoryHistory(history)).toEqual(history);
    expect(() =>
      parseInventoryHistory({
        ...history,
        data: [{ ...history.data[0], delta: 1 }],
      }),
    ).toThrow();
  });
});
