export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const deep = url.searchParams.get('deep') === '1';
  const timestamp = new Date().toISOString();
  const headers = { 'Cache-Control': 'no-store' };

  if (!deep) {
    return Response.json(
      { status: 'ok', service: 'web', timestamp },
      { status: 200, headers },
    );
  }

  const apiOrigin = (process.env.API_INTERNAL_URL ?? 'http://localhost:3001').replace(/\/+$/, '');
  try {
    const upstream = await fetch(`${apiOrigin}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    if (!upstream.ok) {
      return Response.json(
        { status: 'error', service: 'web', upstream: 'down', timestamp },
        { status: 503, headers },
      );
    }
    return Response.json(
      { status: 'ok', service: 'web', upstream: 'up', timestamp },
      { status: 200, headers },
    );
  } catch {
    return Response.json(
      { status: 'error', service: 'web', upstream: 'down', timestamp },
      { status: 503, headers },
    );
  }
}
