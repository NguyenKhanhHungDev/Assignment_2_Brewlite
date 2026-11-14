import { describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/health/route';

describe('GET /api/health', () => {
  it('returns 200 ok for web readiness check', async () => {
    const response = await GET(new Request('http://localhost:3000/api/health'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = await response.json();
    expect(body).toMatchObject({ status: 'ok', service: 'web' });
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });

  it('returns 200 with upstream up when deep=1 and API health succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'ok' }), { status: 200 })),
    );

    const response = await GET(new Request('http://localhost:3000/api/health?deep=1'));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: 'ok',
      service: 'web',
      upstream: 'up',
    });
  });

  it('returns 503 with upstream down when deep=1 and API health fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    );

    const response = await GET(new Request('http://localhost:3000/api/health?deep=1'));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      status: 'error',
      service: 'web',
      upstream: 'down',
    });
  });
});
