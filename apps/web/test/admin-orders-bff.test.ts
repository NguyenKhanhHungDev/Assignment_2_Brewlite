import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleSessionRequest } from "@/lib/session-server";
import { linkedOrderId } from "@/components/admin/orders/orders-config";

const token = `header.${Buffer.from(JSON.stringify({ sub: 7, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.signature`;
function call(path: string, method = "GET", body?: object) {
  return new Request(`http://localhost:3000/api/session/proxy/${path}`, {
    method,
    headers: {
      cookie: `brewlite-session=${token}`,
      origin: "http://localhost:3000",
      "x-brewlite-csrf": "1",
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
beforeEach(() => {
  vi.stubEnv("BFF_PROXY_SECRET", "orders-contract-test-only");
  vi.stubEnv("API_INTERNAL_URL", "http://orders-api.test:3001");
  vi.stubEnv("APP_ORIGIN", "http://localhost:3000");
});
afterEach(() => vi.unstubAllEnvs());

describe("Admin Orders BFF contract with mock upstream", () => {
  it.each([
    [
      "admin/orders?page=2&limit=20&status=PAID&paymentStatus=SUCCESS&search=customer&dateFrom=2026-11-01&dateTo=2026-11-13",
      "GET",
      undefined,
    ],
    ["admin/orders/12", "GET", undefined],
    ["admin/orders/12/status", "PATCH", { status: "PREPARING" }],
    ["admin/orders/12/cancel", "POST", { reason: "Khách yêu cầu" }],
  ] as const)(
    "forwards %s %s without altering the contract",
    async (path, method, body) => {
      const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }));
      vi.stubGlobal("fetch", fetchMock);
      const response = await handleSessionRequest(call(path, method, body), [
        "proxy",
        ...path.split("?")[0].split("/"),
      ]);
      expect(response.status).toBe(200);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`http://orders-api.test:3001/${path}`);
      expect(init.method).toBe(method);
      expect(new Headers(init.headers).get("Authorization")).toBe(
        `Bearer ${token}`,
      );
      expect(init.body).toBe(body ? JSON.stringify(body) : undefined);
    },
  );
  it.each([400, 401, 403, 404, 409])(
    "preserves backend error %s",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            Response.json({ message: "Order rejected" }, { status }),
          ),
      );
      const response = await handleSessionRequest(
        call("admin/orders/12/cancel", "POST", { reason: "Hủy" }),
        ["proxy", "admin", "orders", "12", "cancel"],
      );
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ message: "Order rejected" });
    },
  );
  it("rejects unauthenticated reads and cross-origin writes before upstream", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(
      (
        await handleSessionRequest(
          new Request("http://localhost:3000/api/session/proxy/admin/orders"),
          ["proxy", "admin", "orders"],
        )
      ).status,
    ).toBe(401);
    const foreign = call("admin/orders/12/status", "PATCH", {
      status: "PREPARING",
    });
    foreign.headers.set("origin", "http://foreign.test");
    expect(
      (
        await handleSessionRequest(foreign, [
          "proxy",
          "admin",
          "orders",
          "12",
          "status",
        ])
      ).status,
    ).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
describe("Order detail deep-link validation", () => {
  it.each([
    undefined,
    ["12", "13"],
    "0",
    "-1",
    "1.2",
    "01",
    "2147483648",
    "12/status",
  ])("rejects %s", (input) => expect(linkedOrderId(input)).toBeNull());
  it("accepts a positive database order ID", () =>
    expect(linkedOrderId("12")).toBe(12));
});
