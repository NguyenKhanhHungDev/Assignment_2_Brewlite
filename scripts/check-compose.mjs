import assert from 'node:assert/strict';

function argValue(prefix) {
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

const apiUrl = (
  argValue('--api-url=') ??
  process.env.API_URL ??
  `http://127.0.0.1:${process.env.API_PORT ?? '3001'}`
).replace(/\/+$/, '');

const webUrl = (
  argValue('--web-url=') ??
  process.env.WEB_URL ??
  `http://127.0.0.1:${process.env.WEB_PORT ?? '3000'}`
).replace(/\/+$/, '');

const timeoutMs = Number(process.env.CHECK_TIMEOUT_MS ?? '60000');

async function pollJson(url, expectedStatus = 200) {
  const deadline = Date.now() + timeoutMs;
  let lastError = '';
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (response.status === expectedStatus) {
        return await response.json();
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for ${url} (expected ${expectedStatus}, last: ${lastError})`);
}

const apiHealth = await pollJson(`${apiUrl}/health`);
assert.equal(apiHealth.status, 'ok');
assert.equal(apiHealth.service, 'api');
assert.equal(apiHealth.database, 'up');
console.log(`PASS API health (${apiUrl}/health): status=ok, database=up`);

const apiProducts = await pollJson(`${apiUrl}/products`);
assert.ok(Array.isArray(apiProducts) && apiProducts.length > 0, 'Expected seeded products from API');
console.log(`PASS API products (${apiUrl}/products): ${apiProducts.length} items`);

const webHealth = await pollJson(`${webUrl}/api/health`);
assert.equal(webHealth.status, 'ok');
assert.equal(webHealth.service, 'web');
console.log(`PASS Web health (${webUrl}/api/health): status=ok`);

const webDeepHealth = await pollJson(`${webUrl}/api/health?deep=1`);
assert.equal(webDeepHealth.status, 'ok');
assert.equal(webDeepHealth.service, 'web');
assert.equal(webDeepHealth.upstream, 'up');
console.log(`PASS Web deep health (${webUrl}/api/health?deep=1): upstream=up`);

const webHomeResponse = await fetch(`${webUrl}/`, { signal: AbortSignal.timeout(5000) });
assert.equal(webHomeResponse.status, 200);
const html = await webHomeResponse.text();
assert.match(html, /<html[^>]*lang="vi"/);
assert.match(html, /id="hero-heading"/);
assert.match(html, /id="menu-heading"/);
assert.match(html, /Thực đơn BrewLite/);
console.log(`PASS Web home (${webUrl}/): HTTP 200, lang=vi, BrewLite menu headings`);

const proxiedProductsResponse = await fetch(`${webUrl}/products`, { signal: AbortSignal.timeout(5000) });
assert.equal(proxiedProductsResponse.status, 200);
const proxiedProducts = await proxiedProductsResponse.json();
assert.deepEqual(proxiedProducts, apiProducts);
console.log(`PASS Web rewrite (${webUrl}/products -> API): ${proxiedProducts.length} matching items`);

const bffResponse = await fetch(`${webUrl}/api/session/login`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Origin: new URL(webUrl).origin,
    'x-brewlite-csrf': '1',
  },
  body: JSON.stringify({ email: 'compose-health-check@example.invalid', password: 'invalid-password' }),
  signal: AbortSignal.timeout(5000),
});
assert.ok(
  bffResponse.status === 400 || bffResponse.status === 401,
  `Expected BFF login probe to return 400/401 from API, got ${bffResponse.status}`,
);
console.log(`PASS Web BFF (${webUrl}/api/session/login -> API): HTTP ${bffResponse.status}`);
