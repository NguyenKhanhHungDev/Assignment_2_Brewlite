import { cpus, totalmem, platform, release } from 'node:os';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const settings = { warmup: 10, requests: 100, concurrency: 5, timeoutMs: 5000 };

export function localApiUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Chỉ dùng API HTTP local: http://127.0.0.1:<port> (không dùng production).');
  }
  return url.origin;
}

export function summarize(durations, failures) {
  const sorted = [...durations].sort((a, b) => a - b);
  const p95Ms = sorted.length ? sorted[Math.ceil(sorted.length * 0.95) - 1] : null;
  return { requests: durations.length + failures, successes: durations.length, failures,
    p95Ms, passed: failures === 0 && p95Ms !== null && p95Ms <= 2000 };
}

export async function measureEndpoint(url, validate, options = settings) {
  // Do not follow redirects: a local check must never reach an external service.
  async function request() {
    const start = performance.now();
    const response = await fetch(url, { signal: AbortSignal.timeout(options.timeoutMs), redirect: 'error' });
    if (response.status !== 200) {
      await response.body?.cancel();
      throw new Error(`HTTP ${response.status}`);
    }
    const body = await response.json();
    validate(body);
    return { body, duration: performance.now() - start };
  }
  let firstBody;
  for (let i = 0; i < options.warmup; i++) {
    try {
      const { body } = await request();
      firstBody ??= body;
    } catch {
      throw new Error(`Warm-up thất bại tại ${new URL(url).pathname}; kiểm tra API và dữ liệu seed.`);
    }
  }
  const durations = [];
  let failures = 0;
  let next = 0;
  await Promise.all(Array.from({ length: options.concurrency }, async () => {
    while (next++ < options.requests) {
      try { durations.push((await request()).duration); }
      catch { failures++; }
    }
  }));
  return { path: new URL(url).pathname, warmup: options.warmup, ...summarize(durations, failures), firstBody };
}

function validateProduct(product) {
  if (!product || !Number.isInteger(product.id) || product.id <= 0
    || typeof product.name !== 'string' || !product.name.trim()
    || !Number.isSafeInteger(product.price) || product.price < 0
    || typeof product.imageUrl !== 'string' || typeof product.category !== 'string'
    || !Number.isSafeInteger(product.stock) || product.stock < 0
    || !['S', 'M', 'L'].every(size => Number.isSafeInteger(product.stockBySize?.[size])
      && product.stockBySize[size] >= 0)) throw new Error('Dữ liệu món không đúng hợp đồng.');
}

export async function runBenchmark(value) {
  const baseUrl = localApiUrl(value);
  const list = await measureEndpoint(`${baseUrl}/products`, body => {
    if (!Array.isArray(body) || body.length === 0) throw new Error('Menu rỗng.');
    body.forEach(validateProduct);
  });
  const id = list.firstBody[0].id;
  const detail = await measureEndpoint(`${baseUrl}/products/${id}`, body => {
    validateProduct(body);
    if (body.id !== id) throw new Error('Sai ID món.');
  });
  const endpoints = [list, detail].map(({ firstBody: _body, ...summary }) => summary);
  return { checkedAt: new Date().toISOString(), baseUrl, settings,
    environment: { node: process.version, os: `${platform()} ${release()}`,
      cpu: cpus()[0]?.model, logicalCpus: cpus().length, ramGiB: Math.round(totalmem() / 2 ** 30) },
    dataset: { menuItems: list.firstBody.length, detailId: id,
      note: 'Dữ liệu hiện có của stack local; người chạy xác nhận nguồn seed và image/commit trong báo cáo.' },
    endpoints, passed: endpoints.every(endpoint => endpoint.passed) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || (args[0] && !args[0].startsWith('--api-url='))) {
      throw new Error('Cách chạy: node scripts/check-menu-performance.mjs --api-url=http://127.0.0.1:3001');
    }
    const report = await runBenchmark(args[0]?.slice('--api-url='.length) ?? 'http://127.0.0.1:3001');
    console.log(JSON.stringify(report, null, 2));
    if (!report.passed) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Không đo được hiệu năng.');
    process.exitCode = 1;
  }
}
