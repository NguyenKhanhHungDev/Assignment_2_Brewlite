import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, test } from 'node:test';
import { runBenchmark, measureEndpoint, summarize, localApiUrl } from './check-menu-performance.mjs';

const product = { id: 7, name: 'Cà phê', price: 35000, stock: 10,
  stockBySize: { S: 12, M: 10, L: 8 }, imageUrl: '/coffee.jpg', category: 'COFFEE' };

async function serve(handler) {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return `http://127.0.0.1:${server.address().port}`;
}

test('measures both real HTTP routes with 10 warm-ups and 100 requests, at most 5 concurrent', async () => {
  const counts = new Map();
  let active = 0;
  let peak = 0;
  const url = await serve((req, res) => {
    counts.set(req.url, (counts.get(req.url) ?? 0) + 1);
    peak = Math.max(peak, ++active);
    setTimeout(() => {
      --active;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(req.url === '/products' ? [product] : product));
    }, 3);
  });
  const result = await runBenchmark(url);
  assert.equal(result.passed, true);
  assert.equal(counts.get('/products'), 110);
  assert.equal(counts.get('/products/7'), 110);
  assert.ok(peak > 1 && peak <= 5);
  assert.equal(result.endpoints[0].requests, 100);
  assert.equal(result.endpoints[1].failures, 0);
});

test('p95 uses nearest rank and a slow or failed request cannot produce a passing report', () => {
  assert.equal(summarize([1, 2, 3, 4, 5, 6, 7, 8, 9, 2001], 0).passed, false);
  assert.equal(summarize([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 0).p95Ms, 100);
  assert.equal(summarize([10, 20], 1).passed, false);
  assert.equal(summarize([], 2).p95Ms, null);
});

test('HTTP errors, invalid JSON/data, timeouts and redirects count as failures', async () => {
  const url = await serve((req, res) => {
    if (req.url === '/slow') return; // Closed by test cleanup; never wait on a real external service.
    if (req.url === '/redirect') { res.writeHead(302, { Location: 'https://example.invalid' }); res.end(); return; }
    if (req.url === '/error') res.statusCode = 503;
    res.end(req.url === '/json' ? 'not json' : '{}');
  });
  for (const path of ['/slow', '/redirect', '/error', '/json', '/data']) {
    const result = await measureEndpoint(`${url}${path}`, body => {
      if (body.id !== 7) throw new Error('Invalid product');
    }, { warmup: 0, requests: 2, concurrency: 1, timeoutMs: 40 });
    assert.equal(result.failures, 2, path);
    assert.equal(result.passed, false, path);
  }
});

test('rejects external URLs and URL credentials before making requests', () => {
  for (const url of ['https://brewlite-a2.duckdns.org', 'http://user:password@localhost',
    'file:///tmp/test', 'http://127.0.0.1/api', 'http://localhost?x=1']) {
    assert.throws(() => localApiUrl(url));
  }
  assert.equal(localApiUrl('http://127.0.0.1:3001/'), 'http://127.0.0.1:3001');
});

test('refuses to report a benchmark for an empty menu or wrong detail ID', async () => {
  const empty = await serve((_req, res) => res.end('[]'));
  await assert.rejects(runBenchmark(empty), /Warm-up/);
  const wrong = await serve((req, res) => res.end(JSON.stringify(req.url === '/products'
    ? [product] : { ...product, id: 9 })));
  await assert.rejects(runBenchmark(wrong), /Warm-up/);
});
