import { afterEach, describe, expect, it, vi } from 'vitest';
import { sanitizePeerHeaders } from '../server.mjs';

function makeRequest(headers: Record<string, string>, remoteAddress = '172.18.0.5') {
  return {
    headers: { ...headers },
    socket: { remoteAddress },
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('sanitizePeerHeaders', () => {
  it('ignores spoofed XFF and internal proxy headers when CADDY_PROXY_SECRET is unset', () => {
    const req = makeRequest({
      'x-forwarded-for': '203.0.113.99',
      'x-brewlite-real-ip': '203.0.113.99',
      'x-brewlite-proxy-token': 'any',
      'x-brewlite-client-ip': '203.0.113.99',
      'x-brewlite-proxy-secret': 'leak',
      'x-forwarded-host': 'evil.example',
      'x-forwarded-proto': 'https',
    });

    sanitizePeerHeaders(req);

    expect(req.headers['x-forwarded-for']).toBe('172.18.0.5');
    expect(req.headers['x-brewlite-real-ip']).toBeUndefined();
    expect(req.headers['x-brewlite-proxy-token']).toBeUndefined();
    expect(req.headers['x-brewlite-client-ip']).toBeUndefined();
    expect(req.headers['x-brewlite-proxy-secret']).toBeUndefined();
    expect(req.headers['x-forwarded-host']).toBeUndefined();
    expect(req.headers['x-forwarded-proto']).toBeUndefined();
  });

  it('forwards valid real client IP when Caddy proxy token matches CADDY_PROXY_SECRET', () => {
    vi.stubEnv('CADDY_PROXY_SECRET', 'caddy-secret-value');
    const req = makeRequest({
      'x-forwarded-for': '198.51.100.2',
      'x-brewlite-real-ip': '203.0.113.42',
      'x-brewlite-proxy-token': 'caddy-secret-value',
    });

    sanitizePeerHeaders(req);

    expect(req.headers['x-forwarded-for']).toBe('203.0.113.42');
    expect(req.headers['x-brewlite-real-ip']).toBeUndefined();
    expect(req.headers['x-brewlite-proxy-token']).toBeUndefined();
  });

  it('falls back to socket IP when token mismatches or real IP is invalid', () => {
    vi.stubEnv('CADDY_PROXY_SECRET', 'caddy-secret-value');
    const badTokenReq = makeRequest({
      'x-brewlite-real-ip': '203.0.113.42',
      'x-brewlite-proxy-token': 'wrong-token',
    });
    sanitizePeerHeaders(badTokenReq);
    expect(badTokenReq.headers['x-forwarded-for']).toBe('172.18.0.5');

    const badIpReq = makeRequest({
      'x-brewlite-real-ip': 'not-an-ip',
      'x-brewlite-proxy-token': 'caddy-secret-value',
    });
    sanitizePeerHeaders(badIpReq);
    expect(badIpReq.headers['x-forwarded-for']).toBe('172.18.0.5');
  });
});
