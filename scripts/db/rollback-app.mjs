import { options, context, connection, run, main } from './common.mjs';

function imageReference(value) {
  if (!/^[a-z0-9][a-z0-9./:_-]*(?::[a-f0-9]{40}|@sha256:[a-f0-9]{64})$/.test(value ?? '')) throw new Error('Image phải dùng tag commit SHA đầy đủ (40 ký tự) hoặc digest sha256. Không dùng latest.');
  return value;
}
main(async () => {
  const opts = options(['api-image', 'web-image'], ['schema-compatible']);
  if (opts.help) { console.log('Chỉ rollback app, không thay DB: node scripts/db/rollback-app.mjs --project-name NAME --compose-file FILE --api-image IMAGE --web-image IMAGE --schema-compatible [--env-file FILE]'); return; }
  if (!opts['schema-compatible']) throw new Error('Cần --schema-compatible sau khi xác minh image cũ chạy được với schema hiện tại. Rollback image không rollback DB.');
  const api = imageReference(opts['api-image']), web = imageReference(opts['web-image']);
  const ctx = context(opts, { API_IMAGE: api, WEB_IMAGE: web });
  await connection(ctx);
  const config = JSON.parse((await ctx.compose(['config', '--format', 'json'])).stdout);
  if (config.services?.api?.image !== api || config.services?.web?.image !== web) throw new Error('Compose phải dùng API_IMAGE/WEB_IMAGE cho hai service api/web; không rollback cấu hình build local.');
  let needsPull = false;
  for (const image of [api, web]) {
    if ((await run('docker', ['image', 'inspect', '--format', '{{.Id}}', image], { allowFailure: true })).code !== 0) needsPull = true;
  }
  if (needsPull) await ctx.compose(['pull', 'api', 'web']);
  // --no-deps is essential: never re-run the migrate job or replace db during app rollback.
  try {
    await ctx.compose(['up', '-d', '--no-deps', '--no-build', '--pull', 'never', '--wait', '--wait-timeout', '90', 'api', 'web']);
    for (const service of ['api', 'web']) {
      const port = service === 'api' ? 3001 : 3000;
      const path = service === 'api' ? '/health' : '/api/health?deep=1';
      const program = `const r=await fetch('http://127.0.0.1:${port}${path}',{signal:AbortSignal.timeout(5000)});const d=await r.json();if(!r.ok||d.status!=='ok'||d.service!==${JSON.stringify(service)}||${service === 'api' ? "d.database!=='up'" : "d.upstream!=='up'"})process.exit(1);`;
      await ctx.compose(['exec', '-T', service, 'node', '--input-type=module', '-e', program]);
    }
  } catch { throw new Error('Rollback app hoặc health thất bại. Dừng phát hành và kiểm tra từng container; DB không được script restore/migrate.'); }
  return { rolledBack: true, apiImage: api, webImage: web, health: 'ok', databaseRestored: false, migrationsRun: false };
});
