import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Page from "@/app/admin/page";
import AdminShell from "@/components/admin/AdminShell";

const auth = vi.hoisted(() => ({
  request: vi.fn(),
  session: { userId: 7, expiresAt: Date.now() + 3600000 },
  loading: false,
  logout: vi.fn(),
}));
vi.mock("@/components/AuthProvider", () => ({ useAuth: () => auth }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
  useRouter: () => ({ replace: vi.fn() }),
}));

const ingredients = [
  { id: 1, name: "Cà phê rang", unit: "g", stock: 100, reserved: 30, available: 70, minStock: 80 },
  { id: 2, name: "Sữa tươi", unit: "ml", stock: 50, reserved: 0, available: 50, minStock: 50 },
  { id: 3, name: "Đường", unit: "g", stock: 100, reserved: 0, available: 100, minStock: 10 },
];
const recipe = {
  id: 1, name: "Cà phê sữa", price: 35000, imageUrl: "", isActive: true, category: "COFFEE",
  ingredients: [{ ingredientId: 1, name: "Cà phê rang", unit: "g", quantity: 20 }],
};
const orders = { data: [], page: 1, limit: 1, total: 12, totalPages: 12 };
function respond(path: string) {
  if (path === "/ingredients") return Promise.resolve(ingredients);
  if (path === "/recipes") return Promise.resolve([recipe]);
  if (path === "/admin/orders?limit=1") return Promise.resolve(orders);
  if (path === "/auth/me") return Promise.resolve({ id: 7, role: "ADMIN" });
  return Promise.reject(new Error(`Unexpected path: ${path}`));
}
beforeEach(() => { auth.request.mockReset().mockImplementation(respond); });

describe("Admin overview", () => {
  it("shows real totals and low stock based on available quantity including the threshold", async () => {
    render(<Page />);
    expect(await screen.findByText("Cà phê rang")).toBeVisible();
    expect(screen.getByText("Sữa tươi")).toBeVisible();
    expect(screen.queryByText("Đường")).not.toBeInTheDocument();
    expect(within(screen.getByRole("link", { name: /^Nguyên liệu 3/ })).getByText("3")).toBeVisible();
    expect(within(screen.getByRole("link", { name: /^Công thức & món/ })).getByText("1")).toBeVisible();
    expect(within(screen.getByRole("link", { name: /^Đơn hàng/ })).getByText("12")).toBeVisible();
    expect(within(screen.getByRole("link", { name: /^Nguyên liệu sắp hết/ })).getByText("2")).toBeVisible();
    expect(screen.getByRole("link", { name: /Xử lý đơn hàng/ })).toHaveAttribute("href", "/admin/orders");
  });

  it("shows loading without inventing zero totals, then displays an empty inventory", async () => {
    let finish!: (rows: unknown) => void;
    auth.request.mockImplementation((path: string) => path === "/ingredients"
      ? new Promise(resolve => { finish = resolve; }) : respond(path));
    render(<Page />);
    expect(screen.getByText("Đang tải tổng quan…")).toBeVisible();
    expect(screen.getByRole("link", { name: /^Nguyên liệu sắp hết/ })).toHaveTextContent("—");
    await act(async () => finish([]));
    expect(await screen.findByText("Không có nguyên liệu dưới hoặc bằng ngưỡng tồn.")).toBeVisible();
    expect(within(screen.getByRole("link", { name: /^Nguyên liệu sắp hết/ })).getByText("0")).toBeVisible();
  });

  it("reports a failed source and retries it while other totals remain available", async () => {
    auth.request.mockImplementation((path: string) => path === "/ingredients"
      ? Promise.reject(new Error("Không tải được kho")) : respond(path));
    const user = userEvent.setup();
    render(<Page />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Không tải được kho");
    expect(within(screen.getByRole("link", { name: /^Đơn hàng/ })).getByText("12")).toBeVisible();
    expect(screen.getByRole("link", { name: /^Nguyên liệu sắp hết/ })).toHaveTextContent("—");
    auth.request.mockImplementation(respond);
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText("Cà phê rang")).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not load overview data before AdminShell confirms the admin role", async () => {
    auth.request.mockImplementation((path: string) => path === "/auth/me"
      ? Promise.resolve({ id: 7, role: "CUSTOMER" }) : respond(path));
    render(<AdminShell><Page /></AdminShell>);
    expect(await screen.findByRole("heading", { name: /Không có quyền truy cập/ })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Tổng quan cửa hàng" })).not.toBeInTheDocument();
    expect(auth.request.mock.calls.map(([path]) => path)).toEqual(["/auth/me"]);
  });
});
