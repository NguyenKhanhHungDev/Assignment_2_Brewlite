import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrationFiles, checkHistory } from './common.mjs';

const sql = '-- Cà phê\nCREATE TABLE probe(id integer);\n';
const hash = value => createHash('sha256').update(value).digest('hex');
async function fixture(t, content = sql) {
  const dir = await mkdtemp(join(tmpdir(), 'brewlite-migration-history-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  for (const name of ['20260101000000_first', '20260102000000_second']) {
    await mkdir(join(dir, name));
    await writeFile(join(dir, name, 'migration.sql'), content);
  }
  return migrationFiles(dir);
}
const rowsFor = (files, checksum = hash(sql)) => files.map(file => ({
  migration_name: file.name, checksum, finished: true, rolled_back: false,
}));

for (const checkout of ['LF', 'CRLF']) {
  for (const applied of ['LF', 'CRLF']) {
    it(`accepts ${applied} history against ${checkout} checkout before and after deploy`, async t => {
      const content = checkout === 'LF' ? sql : sql.replaceAll('\n', '\r\n');
      const files = await fixture(t, content);
      assert.equal(files[0].checksum, hash(content)); // Image verification retains the raw hash.
      const rows = rowsFor(files, hash(applied === 'LF' ? sql : sql.replaceAll('\n', '\r\n')));
      assert.doesNotThrow(() => checkHistory(rows.slice(0, 1), files));
      assert.doesNotThrow(() => checkHistory(rows, files, true));
    });
  }
}

it('rejects actual SQL, whitespace, BOM, lone CR and missing final newline changes', async t => {
  const files = await fixture(t);
  for (const edited of [sql.replace('integer', 'text'), sql + ' ', '\ufeff' + sql, sql.replaceAll('\n', '\r'), sql.trimEnd()]) {
    assert.throws(() => checkHistory(rowsFor(files, hash(edited)), files), /Lịch sử\/checksum/);
  }
});

it('rejects wrong names, reordered, missing and extra migration history', async t => {
  const files = await fixture(t), rows = rowsFor(files);
  for (const invalid of [
    [{ ...rows[0], migration_name: 'unknown' }, rows[1]],
    [...rows].reverse(), [rows[1]], [...rows, rows[0]],
  ]) assert.throws(() => checkHistory(invalid, files), /Lịch sử\/checksum/);
});

it('rejects unfinished history and incomplete post-deploy history', async t => {
  const files = await fixture(t), rows = rowsFor(files);
  for (const complete of [false, true]) {
    assert.throws(() => checkHistory([{ ...rows[0], finished: false }], files, complete), /chưa hoàn tất/);
  }
  assert.throws(() => checkHistory(rows.slice(0, 1), files, true), /chưa hoàn tất toàn bộ/);
  assert.throws(() => checkHistory([], files, true), /chưa hoàn tất toàn bộ/);
});

it('continues to ignore rolled back attempts without accepting an unfinished active attempt', async t => {
  const files = await fixture(t), rows = rowsFor(files);
  const rolledBack = { ...rows[0], finished: false, rolled_back: true, checksum: 'invalid' };
  assert.doesNotThrow(() => checkHistory([rolledBack, ...rows], files, true));
  assert.throws(() => checkHistory([rolledBack, { ...rows[0], finished: false }], files), /chưa hoàn tất/);
});
