import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleSessionRequest } from "@/lib/session-server";

const token = `header.${Buffer.from(JSON.stringify({ sub: 7, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.signature`;
function call(path: string, method = "GET", body?: object, key?: string) {
  return new Request(`http://localhost:3000/api/session/proxy/${path}`, {
    method,
    headers: {
      cookie: `brewlite-session=${token}`,
      origin: "http://localhost:3000",
      "x-brewlite-csrf": "1",
      "Content-Type": "application/json",
      ...(key ? { "Idempotency-Key": key } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
beforeEach(() => {
  vi.stubEnv("BFF_PROXY_SECRET", "inventory-contract-test-only");
  vi.stubEnv("API_INTERNAL_URL", "http://inventory-api.test:3001");
  vi.stubEnv("APP_ORIGIN", "http://localhost:3000");
});
afterEach(() => vi.unstubAllEnvs());

describe("Inventory authenticated BFF contract (mock upstream)", () => {
  it.each([
    ["ingredients", "GET", undefined],
    ["ingredients", "POST", { name: "Trà", unit: "g", stock: 0, minStock: 10 }],
    ["ingredients/1", "PATCH", { name: "Trà đen", minStock: 20 }],
    ["ingredients/1/restock", "POST", { quantity: 20, reason: "Nhập hàng" }],
    [
      "ingredients/1/adjust",
      "POST",
      { stock: 90, expectedVersion: 4, reason: "Kiểm kho" },
    ],
    ["ingredients/1/movements?page=2", "GET", undefined],
    ["ingredients/1", "DELETE", {}],
  ] as const)(
    "forwards %s %s with auth and unchanged payload/key",
    async (path, method, body) => {
      const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }));
      vi.stubGlobal("fetch", fetchMock);
      const response = await handleSessionRequest(
        call(path, method, body, "inventory-operation-123"),
        ["proxy", ...path.split("?")[0].split("/")],
      );
      expect(response.status).toBe(200);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`http://inventory-api.test:3001/${path}`);
      expect(init.method).toBe(method);
      expect(new Headers(init.headers).get("Authorization")).toBe(
        `Bearer ${token}`,
      );
      expect(new Headers(init.headers).get("Idempotency-Key")).toBe(
        "inventory-operation-123",
      );
      expect(init.body).toBe(body ? JSON.stringify(body) : undefined);
    },
  );

  it("rejects unauthenticated and cross-origin writes before upstream", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const unauthenticated = new Request(
      "http://localhost:3000/api/session/proxy/ingredients",
    );
    expect(
      (await handleSessionRequest(unauthenticated, ["proxy", "ingredients"]))
        .status,
    ).toBe(401);
    const foreign = call("ingredients/1/restock", "POST", { quantity: 1 });
    foreign.headers.set("origin", "http://foreign.test");
    expect(
      (
        await handleSessionRequest(foreign, [
          "proxy",
          "ingredients",
          "1",
          "restock",
        ])
      ).status,
    ).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([400, 401, 403, 404, 409])(
    "preserves backend error status %s",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            Response.json({ message: "Inventory rejected" }, { status }),
          ),
      );
      const response = await handleSessionRequest(
        call(
          "ingredients/1/adjust",
          "POST",
          { stock: 100, expectedVersion: 4, reason: "Kiểm" },
          "same-key",
        ),
        ["proxy", "ingredients", "1", "adjust"],
      );
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ message: "Inventory rejected" });
    },
  );
});
