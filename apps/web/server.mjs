import { timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { isIP } from 'node:net';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// This entry point is required for BFF IP throttling. Never trust client XFF.
// Behind Caddy on the internal Compose network, only trust X-BrewLite-Real-IP
// when accompanied by a matching internal CADDY_PROXY_SECRET.
export function sanitizePeerHeaders(request) {
  const secret = process.env.CADDY_PROXY_SECRET;
  const token = request.headers['x-brewlite-proxy-token'];
  const realIp = request.headers['x-brewlite-real-ip'];
  let clientIp = request.socket.remoteAddress ?? '';

  if (
    secret &&
    typeof token === 'string' &&
    typeof realIp === 'string' &&
    Buffer.byteLength(token) === Buffer.byteLength(secret) &&
    timingSafeEqual(Buffer.from(token), Buffer.from(secret)) &&
    isIP(realIp)
  ) {
    clientIp = realIp;
  }

  request.headers['x-forwarded-for'] = clientIp;
  delete request.headers['x-brewlite-proxy-token'];
  delete request.headers['x-brewlite-real-ip'];
  delete request.headers['x-brewlite-client-ip'];
  delete request.headers['x-brewlite-proxy-secret'];
  delete request.headers['x-forwarded-host'];
  delete request.headers['x-forwarded-proto'];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { default: next } = await import('next');
  const dev = process.argv.includes('--dev');
  const hostname = process.env.BIND_ADDRESS ?? '0.0.0.0';
  const port = Number(process.env.PORT ?? 3000);
  const app = next({ dev, hostname, port });
  await app.prepare();
  const handler = app.getRequestHandler();
  const server = createServer((request, response) => {
    sanitizePeerHeaders(request);
    handler(request, response).catch(() => {
      if (!response.headersSent) response.writeHead(500);
      response.end();
    });
  });
  server.listen(port, hostname);
}
