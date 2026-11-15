import { createReadStream } from 'node:fs';
import { resolve } from 'node:path';
import { options, context, connection, databaseName, validateArchive, quoteId, main } from './common.mjs';
main(async () => {
  const opts = options(['archive', 'database']);
  if (opts.help) { console.log('Chỉ restore vào DB *_test đã tồn tại/rỗng, khác POSTGRES_DB: node scripts/db/restore.mjs --project-name NAME --archive FILE --database NAME_test [--compose-file FILE ...] [--env-file FILE]'); return; }
  const database = databaseName(opts.database);
  if (!database.endsWith('_test')) throw new Error('Restore tự động chỉ cho phép database *_test. Không có tùy chọn ghi đè production.');
  if (!opts.archive) throw new Error('Bắt buộc --archive.');
  const ctx = context(opts), source = await connection(ctx);
  if (database === source.database) throw new Error('Không được restore vào POSTGRES_DB đang cấu hình của stack.');
  const archive = resolve(opts.archive);
  await validateArchive(ctx, archive);
  const objects = await ctx.sql(database, `SELECT
    (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema') +
    (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema') +
    (SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema' AND t.typtype IN ('d','e','r','m')) +
    (SELECT count(*) FROM pg_namespace WHERE nspname !~ '^pg_' AND nspname NOT IN ('public','information_schema')) +
    (SELECT count(*) FROM pg_largeobject_metadata)`);
  if (objects !== '0') throw new Error('Database đích không rỗng. Không xóa/ghi đè dữ liệu; tạo DB test mới.');
  if (await ctx.sql(database, 'SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()') !== '0') throw new Error('Database test đang có kết nối khác. Dừng client trước khi restore.');
  await ctx.compose(['exec', '-T', 'db', 'sh', '-c',
    'exec pg_restore -w -U "$POSTGRES_USER" -d "$1" --single-transaction --exit-on-error --no-owner --no-privileges', 'dbops', database], { input: createReadStream(archive) });
  const relations = JSON.parse(await ctx.sql(database, `SELECT COALESCE(json_agg(t ORDER BY schemaname,tablename),'[]') FROM (SELECT schemaname,tablename FROM pg_tables WHERE schemaname !~ '^pg_' AND schemaname<>'information_schema') t`));
  const tables = [];
  for (const row of relations) tables.push({ schema: row.schemaname, table: row.tablename, rows: await ctx.sql(database, `SELECT count(*) FROM ${quoteId(row.schemaname)}.${quoteId(row.tablename)}`) });
  return { restored: true, database, tables };
});
