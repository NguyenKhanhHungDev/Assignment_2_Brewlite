import { describe, expect, it } from 'vitest';
import { assertLocalTestDatabase } from './test-database.js';

describe('database test target guard', () => {
  it.each([
    'postgresql://user:password@127.0.0.1:5432/brewlite_test',
    'postgres://user@localhost/brewlite_payment_test_validation_test',
    'postgresql://user@[::1]:5432/brewlite_test?schema=public',
  ])('accepts explicit local test targets', url => {
    expect(assertLocalTestDatabase(url)).toBe(url);
  });
  it.each([
    undefined, '', 'not a URL',
    'https://localhost/brewlite_test',
    'postgresql://user:secret@remote.example/brewlite_test',
    'postgresql://user@db/brewlite_test',
    'postgresql://user@127.0.0.1/brewlite',
    'postgresql://user@localhost/brewlite_test_operations',
    'postgresql://user@localhost/brewlite_test?host=remote.example',
    'postgresql://user@localhost/brewlite_test?hostaddr=192.0.2.1',
    'postgresql://user@localhost/brewlite_test?schema=private',
    'postgresql://user@localhost/brewlite_test?dbname=production',
    'postgresql://user@localhost/brewlite_test?options=-c%20search_path=private',
  ])('rejects unsafe targets without exposing the connection string', url => {
    expect(() => assertLocalTestDatabase(url)).toThrow('A local PostgreSQL *_test database is required');
    try { assertLocalTestDatabase(url); } catch (error) {
      expect((error as Error).message).not.toContain('secret');
    }
  });
});
