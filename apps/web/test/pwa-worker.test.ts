// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import manifest from '../app/manifest';

function worker() {
  const handlers: Record<string, (event: unknown) => void> = {};
  const entries = new Map<string, Response>();
  const cache = {
    match: vi.fn(async (key: Request | string) => entries.get(typeof key === 'string' ? key : new URL(key.url).pathname)?.clone()),
    put: vi.fn(async (key: Request | string, response: Response) => { entries.set(typeof key === 'string' ? key : new URL(key.url).pathname, response); }),
    keys: vi.fn(async () => [...entries.keys()].map(key => new Request('https://brew.test' + key))),
    delete: vi.fn(async (key: Request) => entries.delete(new URL(key.url).pathname)),
  };
  const caches = {
    open: vi.fn(async () => cache),
    keys: vi.fn(async () => ['brewlite-static-v0', 'unrelated-cache']),
    delete: vi.fn(async () => true),
  };
  const fetch = vi.fn(async () => new Response('asset', { headers: { 'Content-Type': 'image/png' } }));
  const self = {
    location: new URL('https://brew.test/sw.js'),
    addEventListener: (name: string, cb: (event: unknown) => void) => { handlers[name] = cb; },
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) },
  };
  runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), { self, caches, fetch, URL, Request, Response });
  async function lifecycle(name: string) {
    let done: Promise<unknown> | undefined;
    handlers[name]({ waitUntil: (p: Promise<unknown>) => { done = p; } });
    await done;
  }
  function request(path: string, init: RequestInit = {}, extra = {}) {
    let response: Promise<Response> | undefined;
    const request = new Request('https://brew.test' + path, init);
    for (const [key, value] of Object.entries(extra)) Object.defineProperty(request, key, { value });
    handlers.fetch({
      request,
      respondWith: (p: Promise<Response>) => { response = p; },
    });
    return response;
  }
  return { cache, caches, fetch, lifecycle, request, entries };
}

describe('PWA manifest and icons', () => {
  it('opens BrewLite standalone at the public menu with valid PNG icon sizes', () => {
    expect(manifest()).toMatchObject({ name: 'BrewLite', short_name: 'BrewLite', start_url: '/', scope: '/', display: 'standalone' });
    for (const size of [192, 512]) {
      const icon = manifest().icons?.find(i => i.sizes === `${size}x${size}`);
      expect(icon).toMatchObject({ type: 'image/png' });
      const bytes = readFileSync(new URL(`../public${icon!.src}`, import.meta.url));
      expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(bytes.readUInt32BE(16)).toBe(size);
      expect(bytes.readUInt32BE(20)).toBe(size);
    }
  });
});

describe('service worker isolation', () => {
  it.each(['/api/session/me', '/api/session/proxy/orders', '/products', '/api/products/1', '/orders/1', '/payments/1/status', '/admin', '/account', '/checkout?_rsc=secret'])('does not intercept/cache dynamic request %s', (path) => {
    const sw = worker();
    expect(sw.request(path)).toBeUndefined();
    expect(sw.cache.put).not.toHaveBeenCalled();
    expect(sw.fetch).not.toHaveBeenCalled();
  });
  it.each(['POST', 'PATCH', 'DELETE'])('never intercepts or replays %s', (method) => {
    const sw = worker();
    expect(sw.request('/payments/zalopay/create', { method })).toBeUndefined();
    expect(sw.fetch).not.toHaveBeenCalled();
  });
  it('preloads only the generic offline page/icons without credentials and removes only old BrewLite caches', async () => {
    const sw = worker();
    await sw.lifecycle('install');
    expect(sw.entries.has('/offline.html')).toBe(true);
    expect([...sw.entries.keys()].every(p => p === '/offline.html' || p.startsWith('/icons/'))).toBe(true);
    expect(sw.fetch.mock.calls.every(call => (call as unknown[])[1] && ((call as unknown[])[1] as RequestInit).credentials === 'omit')).toBe(true);
    await sw.lifecycle('activate');
    expect(sw.caches.delete).toHaveBeenCalledWith('brewlite-static-v0');
    expect(sw.caches.delete).not.toHaveBeenCalledWith('unrelated-cache');
  });
  it('falls back to generic offline content without saving authenticated navigation HTML', async () => {
    const sw = worker();
    sw.entries.set('/offline.html', new Response('Bạn đang mất kết nối'));
    sw.fetch.mockResolvedValueOnce(new Response('private order'));
    expect(await (await sw.request('/confirmation/1', {}, { mode: 'navigate' }))?.text()).toBe('private order');
    expect(sw.cache.put).not.toHaveBeenCalled();
    sw.fetch.mockRejectedValueOnce(new TypeError('offline'));
    expect(await (await sw.request('/payment/result?orderId=1', {}, { mode: 'navigate' }))?.text()).toBe('Bạn đang mất kết nối');
    expect(sw.entries.size).toBe(1);
    sw.fetch.mockRejectedValueOnce(new TypeError('offline'));
    expect(await (await sw.request('/products/1', {}, { mode: 'navigate' }))?.text()).toBe('Bạn đang mất kết nối');
  });
  it('caches only allowlisted static content and rejects HTML, auth headers and private responses', async () => {
    const sw = worker();
    sw.fetch.mockResolvedValueOnce(new Response('css', { headers: { 'Content-Type': 'text/css' } }));
    await sw.request('/_next/static/chunks/app.css', {}, { destination: 'style' });
    expect(sw.cache.put).toHaveBeenCalledTimes(1);
    for (const headers of [ { 'Content-Type': 'text/html' }, { 'Content-Type': 'text/css', 'Cache-Control': 'private' }, { 'Content-Type': 'text/css', 'Cache-Control': 'no-store' } ] as Record<string, string>[]) {
      sw.fetch.mockResolvedValueOnce(new Response('sensitive', { headers }));
      await sw.request('/_next/static/chunks/other.css', {}, { destination: 'style' });
    }
    expect(sw.cache.put).toHaveBeenCalledTimes(1);
    expect(sw.request('/_next/static/chunks/auth.css', { headers: { Authorization: 'Bearer private' } }, { destination: 'style' })).toBeUndefined();
    expect(sw.request('/_next/static/chunks/app.css?_rsc=1', {}, { destination: 'style' })).toBeUndefined();
    expect(sw.request('/icons/icon-192.png', { headers: { RSC: '1' } })).toBeUndefined();
  });
});
