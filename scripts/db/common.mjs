import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, open, readFile, readdir, rename, unlink, stat } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { createHash, randomUUID } from 'node:crypto';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../../', import.meta.url));
const baseFlags = ['project-name', 'compose-file', 'env-file'];
export function options(extra, booleans = []) {
  const result = { 'compose-file': [] };
  const args = process.argv.slice(2);
  const allowed = new Set([...baseFlags, ...extra, ...booleans, 'help']);
  for (let i = 0; i < args.length; i++) {
    const key = args[i].startsWith('--') ? args[i].slice(2) : '';
    if (!allowed.has(key)) throw new Error('Tham số không hợp lệ. Dùng --help để xem hướng dẫn.');
    if (key === 'help' || booleans.includes(key)) { result[key] = true; continue; }
    if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Thiếu giá trị --${key}.`);
    if (key === 'compose-file') result[key].push(resolve(args[++i]));
    else {
      if (result[key] !== undefined) throw new Error(`Không lặp lại --${key}.`);
      result[key] = args[++i];
    }
  }
  if (!result.help && !/^[a-z0-9][a-z0-9_-]*$/.test(result['project-name'] ?? '')) throw new Error('Bắt buộc --project-name rõ ràng (tên Compose project).');
  if (!result['compose-file'].length) result['compose-file'].push(join(root, 'compose.yaml'));
  return result;
}
export function databaseName(value) {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(value ?? '')) throw new Error('Tên database phải là chữ thường/số/gạch dưới, tối đa 63 ký tự; không nhận URL.');
  return value;
}
export const quoteId = value => '"' + value.replaceAll('"', '""') + '"';

// Never relay child output on failure: Prisma/Docker/SQL messages may contain credentials or row values.
export async function run(command, args, { input, output, env, allowFailure = false } = {}) {
  const child = spawn(command, args, { cwd: root, env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '', overflow = false;
  child.stderr.resume();
  if (!output) child.stdout.on('data', chunk => {
    if (stdout.length + chunk.length > 2 * 1024 * 1024) { overflow = true; child.kill(); }
    else stdout += chunk.toString();
  });
  const exited = new Promise((resolveExit, reject) => {
    child.on('error', () => reject(new Error('Không khởi chạy được lệnh con. Kiểm tra Docker/Compose và quyền truy cập.')));
    child.on('close', code => resolveExit(code));
  });
  const streams = [];
  if (input) streams.push(pipeline(input, child.stdin)); else child.stdin.end();
  if (output) streams.push(pipeline(child.stdout, output));
  const all = await Promise.allSettled([exited, ...streams]);
  const code = all[0].status === 'fulfilled' ? all[0].value : null;
  if (overflow || all.some(r => r.status === 'rejected') || (code !== 0 && !allowFailure)) throw new Error('Lệnh con thất bại; đã dừng. Kiểm tra container/đích và log tại máy chủ (không chia sẻ secret).');
  return { code, stdout };
}
export function context(opts, overrides = {}) {
  const args = ['compose', '--project-name', opts['project-name']];
  if (opts['env-file']) args.push('--env-file', resolve(opts['env-file']));
  for (const file of opts['compose-file']) args.push('--file', file);
  const compose = (tail, settings = {}) => run('docker', [...args, ...tail], { ...settings, env: { ...overrides, ...settings.env } });
  const sql = async (database, query) => {
    const result = await compose(['exec', '-T', 'db', 'sh', '-c',
      'exec psql -X -w -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$1" -At -c "$2"', 'dbops', database, query]);
    return result.stdout.trim();
  };
  return { opts, compose, sql };
}
export async function connection(ctx) {
  const result = await ctx.compose(['exec', '-T', 'db', 'sh', '-c',
    'exec psql -X -w -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "$1"', 'dbops',
    "SELECT json_build_object('database',current_database(),'user',current_user,'version',current_setting('server_version_num'))"]);
  let data;
  try { data = JSON.parse(result.stdout); } catch { throw new Error('Không đọc được metadata PostgreSQL.'); }
  if (Number(data.version) < 170000 || Number(data.version) >= 180000) throw new Error('Script này yêu cầu PostgreSQL 17.');
  databaseName(data.database);
  return data;
}
export async function target(ctx) {
  const source = await connection(ctx);
  return { ...source, target: databaseName(ctx.opts.database ?? source.database) };
}
export async function sha256(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}
export async function validateArchive(ctx, path, checksumRequired = true) {
  if (!(await stat(path)).isFile() || (await stat(path)).size === 0) throw new Error('Backup không phải file thường hoặc bị rỗng.');
  if (checksumRequired) {
    const expected = (await readFile(path + '.sha256', 'utf8')).trim();
    if (!/^[a-f0-9]{64}$/.test(expected) || await sha256(path) !== expected) throw new Error('Checksum backup không khớp. Không restore.');
  }
  // --list checks the TOC; --file parses/decompresses all archive data, without executing SQL.
  for (const args of [['--list'], ['--file=/dev/null']]) {
    await ctx.compose(['exec', '-T', 'db', 'pg_restore', ...args], { input: createReadStream(path) });
  }
}
export async function backup(ctx) {
  const info = await target(ctx);
  const dir = resolve(ctx.opts['output-dir'] ?? join(root, 'backups'));
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().replaceAll(/[-:.]/g, '');
  const archive = join(dir, `${info.target}-${stamp}-${randomUUID().slice(0, 8)}.dump`);
  const partial = archive + '.partial';
  try {
    const file = await open(partial, 'wx', 0o600); await file.close();
    await ctx.compose(['exec', '-T', 'db', 'sh', '-c',
      'exec pg_dump -w -U "$POSTGRES_USER" -d "$1" --format=custom --no-owner --no-privileges', 'dbops', info.target], { output: createWriteStream(partial, { flags: 'r+' }) });
    await validateArchive(ctx, partial, false);
    const checksum = await sha256(partial);
    const sidecar = await open(archive + '.sha256', 'wx', 0o600);
    try { await sidecar.writeFile(checksum + '\n'); await sidecar.sync(); } finally { await sidecar.close(); }
    const handle = await open(partial, 'r+'); try { await handle.sync(); } finally { await handle.close(); }
    await rename(partial, archive);
    return { archive, sha256: checksum, database: info.target, postgresMajor: 17 };
  } catch {
    await unlink(partial).catch(() => {});
    await unlink(archive + '.sha256').catch(() => {});
    throw new Error('Backup thất bại; không xuất bản archive. Kiểm tra đích, dung lượng và PostgreSQL.');
  }
}
export async function migrationFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const result = [];
  for (const entry of entries.filter(e => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    result.push({ name: entry.name, checksum: await sha256(join(dir, entry.name, 'migration.sql')) });
  }
  if (!result.length) throw new Error('Không tìm thấy migration được review.');
  return result;
}
export async function history(ctx, database) {
  if (await ctx.sql(database, `SELECT to_regclass('public."_prisma_migrations"') IS NOT NULL`) === 'f') return [];
  return JSON.parse(await ctx.sql(database, `SELECT COALESCE(json_agg(t ORDER BY migration_name),'[]') FROM (SELECT migration_name, checksum, finished_at IS NOT NULL AS finished, rolled_back_at IS NOT NULL AS rolled_back FROM "_prisma_migrations") t`));
}
export function checkHistory(rows, files, complete = false) {
  const active = rows.filter(r => !r.rolled_back);
  if (active.some(r => !r.finished)) throw new Error('Có migration thất bại/chưa hoàn tất. Dừng và điều tra; không tự resolve/reset.');
  const expected = files.slice(0, active.length);
  if (active.length > files.length || active.some((row, i) => row.migration_name !== expected[i]?.name || row.checksum !== expected[i]?.checksum)) throw new Error('Lịch sử/checksum migration khác artifact đang review.');
  if (complete && active.length !== files.length) throw new Error('Migration chưa hoàn tất toàn bộ.');
}
export function main(fn) {
  fn().then(result => { if (result !== undefined) console.log(JSON.stringify(result)); }).catch(error => {
    // Only our own validation messages are safe; filesystem errors can include arbitrary paths.
    const safe = error?.code ? 'Lỗi filesystem hoặc tài nguyên. Kiểm tra tham số và quyền truy cập.' : error.message;
    console.error(safe); process.exitCode = 1;
  });
}
