import { resolve, join } from 'node:path';
import { options, context, target, migrationFiles, history, checkHistory, backup, root, main } from './common.mjs';

main(async () => {
  const opts = options(['database', 'output-dir', 'migrations-dir', 'confirm-database'], ['schema-reviewed']);
  if (opts.help) { console.log('Backup rồi Prisma 7 migrate deploy (không seed): node scripts/db/migrate.mjs --project-name NAME --schema-reviewed [--confirm-database NAME] [--database NAME] [--output-dir DIR] [--compose-file FILE ...] [--env-file FILE] [--migrations-dir DIR]'); return; }
  if (!opts['schema-reviewed']) throw new Error('Cần --schema-reviewed sau khi đã review SQL, rủi ro và tương thích với app cũ.');
  const ctx = context(opts), info = await target(ctx);
  if (!info.target.endsWith('_test') && opts['confirm-database'] !== info.target) throw new Error('Database triển khai yêu cầu --confirm-database khớp tên đích. Không chạy tự động trên production chưa được duyệt.');
  const files = await migrationFiles(resolve(opts['migrations-dir'] ?? join(root, 'apps/api/prisma/migrations')));
  checkHistory(await history(ctx, info.target), files);

  // Override the image entrypoint: its normal CMD can seed. This path invokes only Prisma status/deploy.
  const inMigrationImage = async action => {
    const program = `
      import {readFileSync,readdirSync} from 'node:fs';
      import {createHash} from 'node:crypto';
      import {spawnSync} from 'node:child_process';
      const url=new URL(process.env.DATABASE_URL);
      if(url.hostname!=='db' || (url.port && url.port!=='5432') || decodeURIComponent(url.pathname.slice(1))!==process.env.BREWLITE_EXPECTED_DATABASE || decodeURIComponent(url.username)!==process.env.BREWLITE_EXPECTED_USER || url.hash || [...url.searchParams].some(([k,v])=>k!=='schema'||v!=='public')) process.exit(40);
      if(!JSON.parse(readFileSync('node_modules/prisma/package.json','utf8')).version.startsWith('7.'))process.exit(41);
      const action=${JSON.stringify(action)};
      if(action==='manifest'){
        const dir='prisma/migrations';
        const files=readdirSync(dir,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>({name:x.name,checksum:createHash('sha256').update(readFileSync(dir+'/'+x.name+'/migration.sql')).digest('hex')})).sort((a,b)=>a.name.localeCompare(b.name));
        console.log(JSON.stringify(files));
      }else{
        const result=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate',action,'--config','prisma7.config.ts'],{stdio:'ignore'});
        console.log(JSON.stringify({code:result.status}));
        if(result.error || result.status===null)process.exit(42);
      }
    `;
    const result = await ctx.compose(['run', '--rm', '--no-deps', '-T', '--entrypoint', 'node',
      '-e', 'RUN_SEED=false', '-e', `BREWLITE_EXPECTED_DATABASE=${info.target}`, '-e', `BREWLITE_EXPECTED_USER=${info.user}`,
      'migrate', '--input-type=module', '-e', program]);
    try { return JSON.parse(result.stdout); } catch { throw new Error('Metadata từ image migrate không hợp lệ.'); }
  };
  const imageFiles = await inMigrationImage('manifest');
  // History allows LF/CRLF variants; the image must still match reviewed bytes exactly.
  const reviewedImageFiles = files.map(({ name, checksum }) => ({ name, checksum }));
  if (JSON.stringify(imageFiles) !== JSON.stringify(reviewedImageFiles)) throw new Error('Migration trong image khác các file đang review. Dừng trước khi deploy.');
  const before = await inMigrationImage('status');
  if (![0, 1].includes(before.code)) throw new Error('Không kiểm tra được trạng thái migration.');
  const saved = await backup(ctx);
  try {
    if ((await inMigrationImage('deploy')).code !== 0) throw new Error('deploy failed');
    if ((await inMigrationImage('status')).code !== 0) throw new Error('status failed');
    checkHistory(await history(ctx, info.target), files, true);
  } catch {
    throw new Error(`Migration thất bại; dừng phát hành, không đổi API/Web. Backup giữ tại ${saved.archive}. Không tự resolve/reset/restore.`);
  }
  return { migrated: true, database: info.target, migrations: files.length, status: 'up-to-date', seeded: false, backup: saved };
});
