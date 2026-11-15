import { options, context, backup, main } from './common.mjs';
main(async () => {
  const opts = options(['database', 'output-dir']);
  if (opts.help) { console.log('Backup online PostgreSQL 17: node scripts/db/backup.mjs --project-name NAME [--compose-file FILE ...] [--env-file FILE] [--database NAME] [--output-dir DIR]'); return; }
  return backup(context(opts));
});
