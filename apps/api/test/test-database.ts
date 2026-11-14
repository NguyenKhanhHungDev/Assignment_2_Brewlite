/** Fail closed before a test opens a connection or starts an API process. */
export function assertLocalTestDatabase(value: string | undefined): string {
  const message = 'A local PostgreSQL *_test database is required';
  if (!value) throw new Error(message);
  let url: URL;
  try { url = new URL(value); } catch { throw new Error(message); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      !/^\/[a-zA-Z0-9_]+_test$/.test(url.pathname) ||
      [...url.searchParams].some(([key, entry]) => key !== 'schema' || entry !== 'public') ||
      url.hash) throw new Error(message);
  return value;
}
