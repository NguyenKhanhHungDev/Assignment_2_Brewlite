import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, cp, writeFile, readFile, stat, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const enabled = process.env.BREWLITE_DB_OPERATIONS_TESTS === '1';
const oldTag = '1'.repeat(40), newTag = '2'.repeat(40);
let dir, composeFile, fixture, project, env, archive, sourceBefore;
function exec(cmd, args, options = {}) {
  return spawnSync(cmd, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024, ...options });
}
function ok(result) {
  assert.equal(result.status, 0, `${result.error?.message ?? ''}\n${result.stdout}\n${result.stderr}`);
  return result.stdout.trim();
}
function compose(...args) { return exec('docker', ['compose', '-p', project, '-f', composeFile, ...args]); }
function sql(db, query) {
  return ok(compose('exec', '-T', 'db', 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'brewlite', '-d', db, '-At', '-c', query));
}
function script(name, ...args) {
  return exec(process.execPath, [join(root, 'scripts/db', name + '.mjs'), '--project-name', project, '--compose-file', composeFile, ...args]);
}
function snapshot(db) {
  return sql(db, `SELECT json_build_object('parents',(SELECT json_agg(t ORDER BY id) FROM restore_probe t),'children',(SELECT json_agg(t ORDER BY id) FROM restore_child t),'sequence',(SELECT last_value FROM restore_probe_id_seq));`);
}

describe('Database operations with isolated Docker Compose/PostgreSQL 17', { skip: !enabled, concurrency: false }, () => {
  before(async () => {
    assert.ok(process.env.BREWLITE_MIGRATE_TEST_IMAGE, 'Set BREWLITE_MIGRATE_TEST_IMAGE to a migration image built from this checkout');
    dir = await mkdtemp(join(tmpdir(), 'brewlite-dbops-'));
    fixture = join(dir, 'prisma');
    await cp(join(root, 'apps/api/prisma'), fixture, { recursive: true });
    project = 'brewlite-dbops-' + randomUUID().slice(0, 8);
    env = { ...process.env, TEST_DB_PASSWORD: randomUUID(), TEST_MIGRATE_IMAGE: process.env.BREWLITE_MIGRATE_TEST_IMAGE };
    composeFile = join(dir, 'compose.yaml');
    await writeFile(composeFile, `services:
  db:
    image: postgres:17
    environment:
      POSTGRES_USER: brewlite
      POSTGRES_PASSWORD: \${TEST_DB_PASSWORD}
      POSTGRES_DB: brewlite_source_test
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U brewlite -d brewlite_source_test"]
      interval: 1s
      timeout: 3s
      retries: 30
  migrate:
    image: \${TEST_MIGRATE_IMAGE}
    environment:
      DATABASE_URL: postgresql://brewlite:\${TEST_DB_PASSWORD}@db:5432/\${TEST_MIGRATE_DATABASE:-brewlite_migrate_test}?schema=public
    volumes:
      - ${JSON.stringify(fixture + ':/app/prisma:ro')}
    depends_on:
      db:
        condition: service_healthy
  api:
    image: \${API_IMAGE:-brewlite-dbops-fixture:${newTag}}
    environment:
      PORT: '3001'
      SERVICE: api
    depends_on:
      migrate:
        condition: service_completed_successfully
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3001/health').then(r=>process.exit(r.ok?0:1))"]
      interval: 1s
      timeout: 3s
      retries: 20
  web:
    image: \${WEB_IMAGE:-brewlite-dbops-fixture:${newTag}}
    environment:
      PORT: '3000'
      SERVICE: web
    depends_on:
      api:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1))"]
      interval: 1s
      timeout: 3s
      retries: 20
volumes:
  db_data:
`);
    ok(compose('up', '-d', '--wait', 'db'));
    for (const name of ['brewlite_restore_test', 'brewlite_atomic_test', 'brewlite_migrate_test']) ok(compose('exec', '-T', 'db', 'createdb', '-U', 'brewlite', name));
    sql('brewlite_source_test', `CREATE TABLE restore_probe(id serial PRIMARY KEY,name text NOT NULL); CREATE TABLE restore_child(id integer PRIMARY KEY,parent_id integer REFERENCES restore_probe(id)); INSERT INTO restore_probe(name) VALUES ('Khách Hưng'),('Cà phê sữa'); INSERT INTO restore_child VALUES(1,2);`);
    sourceBefore = snapshot('brewlite_source_test');
    console.log(`Isolated project: ${project}; evidence directory: ${dir}`);
  });
  after(() => { if (composeFile) ok(compose('stop')); });

  it('backup publishes a validated custom archive and restore preserves data, constraints and sequence', async () => {
    const result = JSON.parse(ok(script('backup', '--output-dir', join(dir, 'backups'))));
    archive = result.archive;
    assert.ok((await stat(archive)).size > 100);
    assert.equal((await stat(archive)).mode & 0o777, 0o600);
    const checksum = (await readFile(archive + '.sha256', 'utf8')).trim();
    assert.equal(createHash('sha256').update(await readFile(archive)).digest('hex'), checksum);
    const restored = JSON.parse(ok(script('restore', '--archive', archive, '--database', 'brewlite_restore_test')));
    assert.equal(snapshot('brewlite_restore_test'), sourceBefore);
    assert.equal(restored.tables.find(t => t.table === 'restore_probe').rows, '2');
    assert.notEqual(compose('exec', '-T', 'db', 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'brewlite', '-d', 'brewlite_restore_test', '-c', 'INSERT INTO restore_child VALUES (2,999)').status, 0);
    assert.equal(sql('brewlite_restore_test', `INSERT INTO restore_probe(name) VALUES ('Next') RETURNING id`), '3\nINSERT 0 1');
    assert.equal(snapshot('brewlite_source_test'), sourceBefore);
  });

  it('restore refuses the configured source, non-test names and occupied targets without changing data', () => {
    for (const database of ['brewlite_source_test', 'brewlite_live', 'brewlite_restore_test', 'postgres']) assert.notEqual(script('restore', '--archive', archive, '--database', database).status, 0);
    assert.equal(snapshot('brewlite_source_test'), sourceBefore);
    assert.equal(sql('brewlite_restore_test', 'SELECT count(*) FROM restore_probe'), '3');
  });

  it('restore refuses a database containing large objects even when there are no tables', () => {
    ok(compose('exec', '-T', 'db', 'createdb', '-U', 'brewlite', 'brewlite_large_object_test'));
    sql('brewlite_large_object_test', 'SELECT lo_create(0)');
    assert.notEqual(script('restore', '--archive', archive, '--database', 'brewlite_large_object_test').status, 0);
    assert.equal(sql('brewlite_large_object_test', 'SELECT count(*) FROM pg_largeobject_metadata'), '1');
    assert.equal(sql('brewlite_large_object_test', "SELECT count(*) FROM pg_tables WHERE schemaname='public'"), '0');
  });

  it('archive corruption, missing checksum and truncated data fail before any restore writes', async () => {
    const damaged = join(dir, 'damaged.dump');
    const bytes = await readFile(archive);
    await writeFile(damaged, bytes.subarray(0, Math.floor(bytes.length / 2)));
    assert.notEqual(script('restore', '--archive', damaged, '--database', 'brewlite_atomic_test').status, 0);
    await writeFile(damaged + '.sha256', createHash('sha256').update(await readFile(damaged)).digest('hex'));
    assert.notEqual(script('restore', '--archive', damaged, '--database', 'brewlite_atomic_test').status, 0);
    await writeFile(damaged, bytes);
    await writeFile(damaged + '.sha256', '0'.repeat(64));
    assert.notEqual(script('restore', '--archive', damaged, '--database', 'brewlite_atomic_test').status, 0);
    assert.equal(sql('brewlite_atomic_test', "SELECT count(*) FROM pg_tables WHERE schemaname='public'"), '0');
  });

  it('failed backup leaves no completed archive and never leaks a configured password', async () => {
    const out = join(dir, 'failed-backups');
    const result = script('backup', '--database', 'missing_test', '--output-dir', out);
    assert.notEqual(result.status, 0);
    assert.ok(!(result.stdout + result.stderr).includes(env.TEST_DB_PASSWORD));
    const names = await readdir(out).catch(() => []);
    assert.ok(!names.some(n => n.endsWith('.dump') || n.endsWith('.partial')));
  });

  it('restore rolls back every object if a valid archive fails its foreign key check', () => {
    ok(compose('exec', '-T', 'db', 'createdb', '-U', 'brewlite', 'brewlite_invalid_test'));
    sql('brewlite_invalid_test', `CREATE TABLE parent(id int PRIMARY KEY); CREATE TABLE child(parent_id int REFERENCES parent(id)); SET session_replication_role=replica; INSERT INTO child VALUES(999);`);
    const result=JSON.parse(ok(script('backup','--database','brewlite_invalid_test','--output-dir',join(dir,'invalid-data-backups'))));
    assert.notEqual(script('restore','--archive',result.archive,'--database','brewlite_atomic_test').status,0);
    assert.equal(sql('brewlite_atomic_test',"SELECT count(*) FROM pg_tables WHERE schemaname='public'"),'0');
    assert.equal(snapshot('brewlite_source_test'),sourceBefore);
  });

  it('migration requires schema review, backs up, deploys all migrations, checks status and never seeds', () => {
    const args = ['--database', 'brewlite_migrate_test', '--output-dir', join(dir, 'migration-backups'), '--migrations-dir', join(fixture, 'migrations')];
    assert.notEqual(script('migrate', ...args).status, 0);
    const result = JSON.parse(ok(script('migrate', ...args, '--schema-reviewed')));
    assert.ok(result.backup.archive.endsWith('.dump'));
    assert.equal(sql('brewlite_migrate_test', 'SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL'), '16');
    assert.equal(sql('brewlite_migrate_test', 'SELECT count(*) FROM "SeedRun"'), '0');
    assert.equal(sql('brewlite_migrate_test', 'SELECT count(*) FROM "User"'), '0');
    ok(script('migrate', ...args, '--schema-reviewed'));
  });

  it('accepts real LF/CRLF Prisma history in both directions but requires byte-identical image artifacts', async () => {
    const migrations = join(fixture, 'migrations');
    const originals = new Map();
    const out = join(dir, 'line-ending-backups');
    const args = ['--output-dir', out, '--migrations-dir', migrations, '--schema-reviewed'];
    const crlfDatabase = 'brewlite_crlf_test';
    const runCrlfDatabase = () => exec(process.execPath, [
      join(root, 'scripts/db/migrate.mjs'), '--project-name', project, '--compose-file', composeFile,
      '--database', crlfDatabase, ...args,
    ], { env: { ...env, TEST_MIGRATE_DATABASE: crlfDatabase } });
    try {
      for (const entry of await readdir(migrations, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const path = join(migrations, entry.name, 'migration.sql');
        const original = await readFile(path);
        originals.set(path, original);
        const lf = original.toString('latin1').replaceAll('\r\n', '\n');
        await writeFile(path, Buffer.from(lf.replaceAll('\n', '\r\n'), 'latin1'));
      }
      // Existing LF history, CRLF checkout and CRLF image.
      ok(script('migrate', '--database', 'brewlite_migrate_test', ...args));
      ok(compose('exec', '-T', 'db', 'createdb', '-U', 'brewlite', crlfDatabase));
      ok(runCrlfDatabase()); // Prisma itself records CRLF checksums; no history edits.
      const applied = JSON.parse(sql(crlfDatabase, 'SELECT json_agg(t) FROM (SELECT migration_name, checksum FROM "_prisma_migrations") t'));
      assert.equal(applied.length, 16);
      for (const row of applied) {
        assert.equal(row.checksum, createHash('sha256').update(await readFile(join(migrations, row.migration_name, 'migration.sql'))).digest('hex'));
      }
      const crlfReview = join(dir, 'crlf-reviewed-migrations');
      await cp(migrations, crlfReview, { recursive: true });
      for (const [path, original] of originals) await writeFile(path, original);
      ok(runCrlfDatabase()); // Production regression: CRLF history, LF checkout/image.
      const before = await readdir(out);
      const mismatch = script('migrate', '--database', 'brewlite_migrate_test', '--output-dir', out,
        '--migrations-dir', crlfReview, '--schema-reviewed');
      assert.notEqual(mismatch.status, 0);
      assert.match(mismatch.stderr, /Migration trong image khác/);
      assert.deepEqual(await readdir(out), before); // Image mismatch stops before backup/deploy.
      assert.equal(sql(crlfDatabase, 'SELECT count(*) FROM "SeedRun"'), '0');
    } finally {
      for (const [path, original] of originals) await writeFile(path, original);
    }
  });

  it('migration refuses artifact mismatch and modified applied checksums before deployment', async () => {
    const args = ['--database', 'brewlite_migrate_test', '--output-dir', join(dir, 'migration-backups'), '--schema-reviewed'];
    const extra = join(fixture, 'migrations/20990101000000_review_probe');
    await mkdir(extra);
    await writeFile(join(extra, 'migration.sql'), 'ALTER TABLE "User" ADD COLUMN "backupProbe" TEXT;');
    assert.notEqual(script('migrate', ...args).status, 0); // image contains a migration absent from the reviewed checkout
    ok(script('migrate', ...args, '--migrations-dir', join(fixture, 'migrations')));
    assert.equal(sql('brewlite_migrate_test', `SELECT count(*) FROM information_schema.columns WHERE table_name='User' AND column_name='backupProbe'`), '1');
    await writeFile(join(extra, 'migration.sql'), 'ALTER TABLE "User" ADD COLUMN "backupProbe" TEXT; -- edited');
    assert.notEqual(script('migrate', ...args, '--migrations-dir', join(fixture, 'migrations')).status, 0);
    await writeFile(join(extra, 'migration.sql'), 'ALTER TABLE "User" ADD COLUMN "backupProbe" TEXT;');
  });

  it('a failing migration stops release, retains the pre-migration backup and blocks the next attempt', async () => {
    const extra = join(fixture, 'migrations/20990102000000_failure_probe');
    await mkdir(extra);
    await writeFile(join(extra, 'migration.sql'), 'BEGIN; CREATE TABLE failure_probe(id int); SELECT missing_column_for_dbops_test; COMMIT;');
    const out = join(dir, 'failure-migration-backups');
    const args = ['--database', 'brewlite_migrate_test', '--output-dir', out, '--migrations-dir', join(fixture, 'migrations'), '--schema-reviewed'];
    const first = script('migrate', ...args);
    assert.notEqual(first.status, 0);
    assert.ok((await readdir(out)).some(n => n.endsWith('.dump')));
    assert.equal(sql('brewlite_migrate_test', `SELECT count(*) FROM pg_tables WHERE tablename='failure_probe'`), '0');
    assert.equal(sql('brewlite_migrate_test', 'SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL'), '1');
    assert.notEqual(script('migrate', ...args).status, 0);
    assert.equal(snapshot('brewlite_source_test'), sourceBefore);
  });

  it('rollback changes only app images, skips migration dependencies and checks health', async () => {
    const build = join(dir, 'app'); await mkdir(build);
    await writeFile(join(build, 'Dockerfile'), 'FROM node:24-bookworm-slim\nWORKDIR /app\nCOPY server.mjs .\nARG RELEASE\nENV RELEASE=$RELEASE\nCMD ["node","server.mjs"]\n');
    await writeFile(join(build, 'server.mjs'), `import {createServer} from 'node:http';createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({status:'ok',service:process.env.SERVICE,database:'up',upstream:'up',release:process.env.RELEASE}));}).listen(Number(process.env.PORT));`);
    for (const tag of [oldTag,newTag]) ok(exec('docker', ['build', '-q', '-t', 'brewlite-dbops-fixture:'+tag, '--build-arg', 'RELEASE='+tag, build]));
    ok(compose('up', '-d', '--no-deps', '--wait', 'api', 'web'));
    const args = ['--api-image', 'brewlite-dbops-fixture:'+oldTag, '--web-image', 'brewlite-dbops-fixture:'+oldTag];
    assert.notEqual(script('rollback-app', ...args).status, 0);
    ok(script('rollback-app', ...args, '--schema-compatible'));
    for (const service of ['api','web']) {
      const port=service==='api'?3001:3000;
      const text=ok(compose('exec','-T',service,'node','-e',`fetch('http://127.0.0.1:${port}/health').then(r=>r.json()).then(d=>console.log(d.release))`));
      assert.equal(text,oldTag);
    }
    assert.equal(ok(compose('ps','-a','-q','migrate')), '');
    assert.equal(snapshot('brewlite_source_test'), sourceBefore);
    assert.notEqual(script('rollback-app', '--api-image','invalid/no-such-dbops-image:'+oldTag,'--web-image','brewlite-dbops-fixture:'+oldTag,'--schema-compatible').status,0);
    assert.equal(snapshot('brewlite_source_test'), sourceBefore);
  });
});
