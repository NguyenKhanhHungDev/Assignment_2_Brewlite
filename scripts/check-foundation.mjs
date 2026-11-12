import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const children = [];
const development = process.argv.includes('--dev');

async function availablePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

function start(app, script, port) {
  const child = spawn('npm', ['--prefix', path.join(root, 'apps', app), 'run', script], {
    detached: process.platform !== 'win32',
    env: { ...process.env, PORT: String(port), NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const state = { child, output: '', error: undefined };
  child.on('error', (error) => { state.error = error; });
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', (data) => { state.output = (state.output + data).slice(-16000); });
  }
  children.push(state);
  return state;
}

async function ready(state, url, expectedStatus = 200) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (state.error) throw state.error;
    if (state.child.exitCode !== null) throw new Error(`Ứng dụng dừng sớm: ${state.output}`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (response.status === expectedStatus) return response;
    } catch {
      // The process may still be starting; retry until the bounded deadline.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Hết thời gian chờ ${url}: ${state.output}`);
}

async function stop(state) {
  const { child } = state;
  if (!child.pid) return;
  const exited = child.exitCode !== null || child.signalCode !== null
    ? Promise.resolve()
    : once(child, 'exit');
  try {
    if (process.platform === 'win32') child.kill('SIGTERM');
    else process.kill(-child.pid, 'SIGTERM');
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
  }
  let timer;
  await Promise.race([
    exited,
    new Promise((resolve) => {
      timer = setTimeout(() => {
        try {
          if (process.platform === 'win32') child.kill('SIGKILL');
          else process.kill(-child.pid, 'SIGKILL');
        } catch (error) {
          if (error.code !== 'ESRCH') throw error;
        }
        resolve();
      }, 3000);
    }),
  ]);
  clearTimeout(timer);
}

try {
  const apiPort = await availablePort();
  const api = start('api', development ? 'start:dev' : 'start:prod', apiPort);
  const apiResponse = await ready(api, `http://127.0.0.1:${apiPort}/`, 404);
  assert.equal((await apiResponse.json()).statusCode, 404);
  console.log('PASS API: bootstrap OK, unregistered route returns HTTP 404');
  const productsResponse = await ready(api, `http://127.0.0.1:${apiPort}/products`);
  const products = await productsResponse.json();
  assert.ok(Array.isArray(products), 'Products response must be an array');
  if (products.length) {
    const product = products[0];
    assert.ok(Number.isInteger(product.id) && product.id > 0);
    const detailResponse = await ready(api, `http://127.0.0.1:${apiPort}/products/${product.id}`);
    assert.deepEqual(await detailResponse.json(), product);
  }
  console.log(`PASS Products: HTTP 200, ${products.length} menu items, matching details when non-empty`);

  const webPort = await availablePort();
  const web = start('web', development ? 'dev' : 'start', webPort);
  const webResponse = await ready(web, `http://127.0.0.1:${webPort}/`);
  const html = await webResponse.text();
  assert.match(html, /<html[^>]*lang="vi"/);
  assert.match(html, /id="hero-heading"/);
  assert.match(html, /id="menu-heading"/);
  assert.match(html, /Thực đơn BrewLite/);
  console.log('PASS Web: HTTP 200, lang=vi, BrewLite menu headings');
} finally {
  await Promise.all(children.map(stop));
}
