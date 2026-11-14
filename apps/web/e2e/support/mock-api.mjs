import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 3101);
const expectedSecret = process.env.BFF_PROXY_SECRET ?? "browser-e2e-bff-secret";
const userId = 522;
const orderId = 52201;
const product = {
  id: 1,
  name: "Cà phê sữa",
  price: 35_000,
  imageUrl: "/images/products/ca-phe-sua.jpg",
  stock: 10,
  category: "COFFEE",
  stockBySize: { S: 10, M: 10, L: 10 },
};
const profile = {
  id: userId,
  email: "browser.e2e@brewlite.test",
  role: "CUSTOMER",
  loyaltyPoints: 0,
};

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

const accessToken = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: userId, exp: Math.floor(Date.now() / 1000) + 3600 })}.browserE2ESignature`;

function json(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return null;
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function hasTrustedBffHeaders(request) {
  return (
    request.headers["x-brewlite-proxy-secret"] === expectedSecret &&
    typeof request.headers["x-brewlite-client-ip"] === "string"
  );
}

function authorized(request) {
  return request.headers.authorization === `Bearer ${accessToken}`;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);

  try {
    if (request.method === "GET" && url.pathname === "/__e2e/health") {
      return json(response, 200, { status: "ok" });
    }
    if (request.method === "GET" && url.pathname === "/products") {
      return json(response, 200, [product]);
    }
    if (request.method === "GET" && url.pathname === "/products/1") {
      return json(response, 200, product);
    }

    if (url.pathname.startsWith("/auth/") || url.pathname.startsWith("/orders") || url.pathname.startsWith("/payments/")) {
      if (!hasTrustedBffHeaders(request)) {
        return json(response, 403, { message: "Browser E2E request must pass through the trusted BFF." });
      }
    }

    if (request.method === "POST" && url.pathname === "/auth/register") {
      const body = await readJson(request);
      if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
        return json(response, 400, { message: "Invalid registration payload" });
      }
      return json(response, 201, { id: userId, email: body.email });
    }
    if (request.method === "POST" && url.pathname === "/auth/login") {
      const body = await readJson(request);
      if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
        return json(response, 400, { message: "Invalid login payload" });
      }
      return json(response, 200, { accessToken });
    }
    if (request.method === "GET" && url.pathname === "/auth/me") {
      return authorized(request)
        ? json(response, 200, profile)
        : json(response, 401, { message: "Unauthorized" });
    }
    if (request.method === "POST" && url.pathname === "/orders") {
      if (!authorized(request)) return json(response, 401, { message: "Unauthorized" });
      const body = await readJson(request);
      const item = body?.items?.[0];
      const valid =
        request.headers["idempotency-key"] &&
        typeof body?.recipientName === "string" &&
        body.recipientName.trim().length >= 2 &&
        body?.items?.length === 1 &&
        item?.productId === product.id &&
        item?.quantity === 1 &&
        item?.size === "M" &&
        Array.isArray(item?.toppings);
      if (!valid) return json(response, 400, { message: "Browser E2E order contract mismatch" });
      return json(response, 201, {
        orderId,
        status: "PENDING",
        total: product.price,
      });
    }
    if (request.method === "GET" && url.pathname === `/orders/${orderId}`) {
      if (!authorized(request)) return json(response, 401, { message: "Unauthorized" });
      return json(response, 200, {
        id: orderId,
        status: "PENDING",
        total: product.price,
        createdAt: new Date().toISOString(),
        recipientName: "Khách E2E",
        items: [
          {
            productId: product.id,
            recipeName: product.name,
            quantity: 1,
            size: "M",
            toppings: [],
            sugarLevel: 100,
            iceLevel: "NORMAL",
            note: null,
            unitPrice: product.price,
            subtotal: product.price,
          },
        ],
      });
    }
    if (request.method === "GET" && url.pathname === `/payments/${orderId}/status`) {
      if (!authorized(request)) return json(response, 401, { message: "Unauthorized" });
      return json(response, 200, {
        orderId,
        orderStatus: "PENDING",
        latestPayment: null,
      });
    }
    if (request.method === "GET" && url.pathname === `/payments/${orderId}/details`) {
      if (!authorized(request)) return json(response, 401, { message: "Unauthorized" });
      return json(response, 200, {
        orderId,
        orderStatus: "PENDING",
        orderExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
        serverTime: new Date().toISOString(),
        payments: [],
      });
    }

    return json(response, 404, { message: `No E2E fixture for ${request.method} ${url.pathname}` });
  } catch (error) {
    return json(response, 500, {
      message: error instanceof Error ? error.message : "Mock API error",
    });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`BrewLite browser E2E mock API listening on http://127.0.0.1:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
