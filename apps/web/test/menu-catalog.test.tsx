import { render as renderComponent, screen, within, waitFor, act } from "@testing-library/react";
import type { ReactNode } from "react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MenuCatalog from "@/components/MenuCatalog";
import { products } from "./fixtures";
import { MenuProviders } from "./menu-providers";

const render = (ui: ReactNode) => renderComponent(ui, { wrapper: MenuProviders });
beforeEach(() => localStorage.clear());

const menu = () => screen.getByRole("region", { name: "Chọn thức uống bạn yêu thích" });
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
});

function mockFetch() {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("MenuCatalog loading and recovery", () => {
  it("shows loading until the menu request completes, then displays public products", async () => {
    let finish!: (response: Response) => void;
    const fetchMock = mockFetch().mockReturnValue(new Promise(resolve => { finish = resolve; }));
    render(<MenuCatalog />);
    expect(screen.getByRole("status")).toHaveTextContent("Đang chuẩn bị thực đơn");
    expect(fetchMock).toHaveBeenCalledWith("/products", expect.objectContaining({
      cache: "no-store", signal: expect.any(AbortSignal),
    }));
    await act(async () => { finish(reply(products)); });
    const list = within(menu()).getByRole("list");
    expect(within(list).getAllByRole("article")).toHaveLength(4);
    expect(within(list).getByRole("heading", { name: "Cà phê sữa" })).toBeVisible();
    expect(within(list).getByText("35.000")).toBeVisible();
    expect(within(list).getByRole("img", { name: "Cà phê sữa" })).toHaveAttribute("src", products[0].imageUrl);
  });

  it("distinguishes an empty menu from a request error", async () => {
    mockFetch().mockResolvedValue(reply([]));
    render(<MenuCatalog />);
    expect(await screen.findByRole("heading", { name: "Thực đơn đang được cập nhật" })).toBeVisible();
    expect(within(menu()).queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Thử lại" })).not.toBeInTheDocument();
  });

  it.each(["http", "network", "invalid", "invalid-json"])("shows %s failure and recovers on keyboard retry", async failure => {
    const fetchMock = mockFetch();
    if (failure === "network") fetchMock.mockRejectedValueOnce(new TypeError("Network unavailable"));
    else if (failure === "http") fetchMock.mockResolvedValueOnce(reply({}, 503));
    else if (failure === "invalid-json") fetchMock.mockResolvedValueOnce(new Response("not json"));
    else fetchMock.mockResolvedValueOnce(reply({ invalid: true }));
    fetchMock.mockResolvedValueOnce(reply(products));
    const user = userEvent.setup();
    render(<MenuCatalog />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể tải thực đơn");
    screen.getByRole("button", { name: "Thử lại" }).focus();
    await user.keyboard("{Enter}");
    expect(await within(menu()).findByRole("list")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("heading", { name: "Không thể tải thực đơn" })).not.toBeInTheDocument();
  });

  it("aborts its pending request when unmounted", () => {
    const fetchMock = mockFetch().mockReturnValue(new Promise(() => {}));
    const { unmount } = render(<MenuCatalog />);
    const signal = fetchMock.mock.calls[0][1]?.signal;
    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it("times out a stalled request and offers retry", async () => {
    vi.useFakeTimers();
    mockFetch().mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
    render(<MenuCatalog />);
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(screen.getByRole("alert")).toHaveTextContent("Không thể tải thực đơn");
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeEnabled();
  });
});

describe("Menu search and categories", () => {
  it("normalizes accents, case, spaces and đ/d, combines filters and resets", async () => {
    mockFetch().mockResolvedValue(reply(products));
    const user = userEvent.setup();
    render(<MenuCatalog />);
    await within(menu()).findByRole("list");
    const search = screen.getByRole("textbox", { name: "Tìm kiếm thức uống" });
    await user.type(search, "  TRA DAO  ");
    await waitFor(() => expect(within(menu()).getAllByRole("article")).toHaveLength(1));
    expect(within(menu()).getByRole("heading", { name: "Trà đào" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Cà phê truyền thống" }));
    expect(screen.getByRole("heading", { name: "Không tìm thấy món phù hợp" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Xem toàn bộ thực đơn" }));
    await waitFor(() => expect(within(menu()).getAllByRole("article")).toHaveLength(4));
    expect(search).toHaveValue("");
    expect(screen.getByRole("button", { name: /^Tất cả/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("combines API categories with legacy name-based suggestions", async () => {
    mockFetch().mockResolvedValue(reply(products));
    const user = userEvent.setup();
    render(<MenuCatalog />);
    await within(menu()).findByRole("list");
    await user.click(screen.getByRole("button", { name: "Món sáng tạo" }));
    expect(within(menu()).getAllByRole("article")).toHaveLength(2);
    expect(within(menu()).getByRole("heading", { name: "Matcha latte" })).toBeVisible();
    expect(within(menu()).getByRole("heading", { name: "Cà phê muối" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Cà phê truyền thống" }));
    expect(within(menu()).getAllByRole("article")).toHaveLength(2);
  });

  it("finds coffee and tea by name when the API category is OTHER", async () => {
    mockFetch().mockResolvedValue(reply([
      { ...products[0], category: "OTHER", name: "Bạc xỉu" },
      { ...products[2], category: "OTHER" },
    ]));
    const user = userEvent.setup();
    render(<MenuCatalog />);
    await within(menu()).findByRole("list");
    await user.click(screen.getByRole("button", { name: "Cà phê truyền thống" }));
    expect(within(menu()).getAllByRole("article")).toHaveLength(1);
    expect(within(menu()).getByRole("heading", { name: "Bạc xỉu" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Trà trái cây & Trà sữa" }));
    expect(within(menu()).getAllByRole("article")).toHaveLength(1);
    expect(within(menu()).getByRole("heading", { name: "Trà đào" })).toBeVisible();
  });
});
