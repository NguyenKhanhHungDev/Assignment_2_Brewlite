import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assertLocalTestDatabase } from './test-database.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const migrationRoot = new URL('../prisma/migrations/', import.meta.url);
const migrations = readdirSync(migrationRoot, { withFileTypes: true })
  .filter(entry => entry.isDirectory()).map(entry => entry.name).sort();

describe('Task 5.2.3: clean PostgreSQL migrations and seed', () => {
  let pool: Pool;
  function prisma(...args: string[]) {
    // Capture output: assertion errors never include a URL, password or child env.
    try {
      return execFileSync(process.execPath, ['node_modules/prisma/build/index.js', ...args, '--config', 'prisma7.config.ts'], {
        cwd: root, env: process.env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 25000,
      });
    } catch { throw new Error(`Prisma ${args.slice(0, 2).join(' ')} failed; inspect the local test environment`); }
  }
  async function snapshot() {
    const result: Record<string, unknown[]> = {};
    for (const table of ['Ingredient', 'Recipe', 'RecipeIngredient', 'SeedRun']) {
      result[table] = (await pool.query(`SELECT * FROM "${table}" ORDER BY 1, 2`)).rows;
    }
    return result;
  }
  beforeAll(async () => {
    if (process.env.BREWLITE_DB_TESTS !== '1') throw new Error('Set BREWLITE_DB_TESTS=1 explicitly');
    const target = assertLocalTestDatabase(process.env.DATABASE_URL);
    pool = new Pool({ connectionString: target, max: 2 });
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    if (tables.rowCount !== 0) throw new Error('Database validation requires a NEW empty test database; existing data is preserved');
    prisma('migrate', 'deploy');
  });
  afterAll(async () => { await pool?.end(); });

  it('applies exactly the versioned migration chain with unchanged checksums and no failed rows', async () => {
    const rows = (await pool.query('SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY migration_name')).rows;
    expect(rows.map(row => row.migration_name)).toEqual(migrations);
    for (const row of rows) {
      expect(row.finished_at).not.toBeNull();
      expect(row.rolled_back_at).toBeNull();
      const sql = readFileSync(new URL(`${row.migration_name}/migration.sql`, migrationRoot));
      expect(row.checksum).toBe(createHash('sha256').update(sql).digest('hex'));
    }
    prisma('migrate', 'status');
  });
  it('creates every domain table, foreign key, idempotency index and inventory check', async () => {
    const tables = (await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")).rows.map(row => row.table_name);
    expect(tables).toEqual(['Ingredient', 'InventoryMovement', 'Order', 'OrderIngredient', 'OrderItem', 'Payment', 'Product', 'Recipe', 'RecipeIngredient', 'SeedRun', 'User', '_prisma_migrations']);
    const names = (await pool.query("SELECT conname FROM pg_constraint WHERE connamespace = 'public'::regnamespace")).rows.map(row => row.conname);
    for (const name of ['Order_userId_fkey', 'OrderItem_orderId_fkey', 'OrderItem_recipeId_fkey', 'OrderItem_productId_fkey', 'RecipeIngredient_recipeId_fkey', 'RecipeIngredient_ingredientId_fkey', 'OrderIngredient_orderId_fkey', 'OrderIngredient_ingredientId_fkey', 'Payment_orderId_fkey', 'InventoryMovement_actorId_fkey', 'InventoryMovement_ingredientId_fkey', 'Order_cancelledById_fkey', 'Payment_adminNoteUpdatedById_fkey', 'Ingredient_reserved_check', 'OrderItem_sugarLevel_check', 'OrderItem_iceLevel_check', 'InventoryMovement_valid_stock']) expect(names).toContain(name);
    const indexes = (await pool.query("SELECT indexname FROM pg_indexes WHERE schemaname = 'public'")).rows.map(row => row.indexname);
    for (const name of ['User_email_key', 'Recipe_name_key', 'Ingredient_name_key', 'Order_userId_idempotencyKey_key', 'Payment_userId_idempotencyKey_key', 'Payment_transactionRef_key', 'InventoryMovement_actorId_idempotencyKey_key', 'InventoryMovement_ingredientId_createdAt_idx']) expect(indexes).toContain(name);
  });
  it('deploys a second time without changing migration history', async () => {
    const before = (await pool.query('SELECT * FROM "_prisma_migrations" ORDER BY migration_name')).rows;
    prisma('migrate', 'deploy');
    expect((await pool.query('SELECT * FROM "_prisma_migrations" ORDER BY migration_name')).rows).toEqual(before);
  });
  it('seeds 15 ingredients, 10 recipes and 42 valid recipe links on the clean database', async () => {
    prisma('db', 'seed');
    const data = await snapshot();
    expect(data.Ingredient).toHaveLength(15);
    expect(data.Recipe).toHaveLength(10);
    expect(data.RecipeIngredient).toHaveLength(42);
    expect(data.SeedRun).toHaveLength(1);
    const invalid = await pool.query('SELECT ri.* FROM "RecipeIngredient" ri LEFT JOIN "Recipe" r ON r.id=ri."recipeId" LEFT JOIN "Ingredient" i ON i.id=ri."ingredientId" WHERE r.id IS NULL OR i.id IS NULL OR ri.quantity <= 0');
    expect(invalid.rowCount).toBe(0);
  });
  it('seeds a second time without duplicates or changes to any seeded row', async () => {
    const before = await snapshot();
    prisma('db', 'seed');
    expect(await snapshot()).toEqual(before);
  });
  it('preserves edited price/name/stock, then restores only this test edit', async () => {
    const originalRecipe = (await pool.query('SELECT id, name, price FROM "Recipe" ORDER BY id LIMIT 1')).rows[0];
    const originalIngredient = (await pool.query('SELECT id, name, stock FROM "Ingredient" WHERE name=$1', ['Cà phê bột'])).rows[0];
    try {
      await pool.query('UPDATE "Recipe" SET name=$1, price=$2 WHERE id=$3', ['Edited recipe task523', 55555, originalRecipe.id]);
      await pool.query('UPDATE "Ingredient" SET name=$1, stock=$2 WHERE id=$3', ['Edited ingredient task523', 4321, originalIngredient.id]);
      const edited = await snapshot();
      prisma('db', 'seed');
      expect(await snapshot()).toEqual(edited);
    } finally {
      await pool.query('UPDATE "Recipe" SET name=$1, price=$2 WHERE id=$3', [originalRecipe.name, originalRecipe.price, originalRecipe.id]);
      await pool.query('UPDATE "Ingredient" SET name=$1, stock=$2 WHERE id=$3', [originalIngredient.name, originalIngredient.stock, originalIngredient.id]);
    }
  });
  it('enforces SQL uniqueness, references and stock/price/preference checks with rollback', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const checks: [string, string][] = [
        ['UPDATE "Ingredient" SET stock=-1 WHERE id=(SELECT min(id) FROM "Ingredient")', '23514'],
        ['UPDATE "Ingredient" SET reserved=stock+1 WHERE id=(SELECT min(id) FROM "Ingredient")', '23514'],
        ['UPDATE "Recipe" SET price=-1 WHERE id=(SELECT min(id) FROM "Recipe")', '23514'],
        ['UPDATE "RecipeIngredient" SET quantity=0', '23514'],
        ['INSERT INTO "Ingredient" (name,unit) SELECT name,unit FROM "Ingredient" LIMIT 1', '23505'],
        ['INSERT INTO "Order" ("userId",total) VALUES (2147483647,10000)', '23503'],
      ];
      for (const [sql, code] of checks) {
        await client.query('SAVEPOINT invalid_data');
        await expect(client.query(sql)).rejects.toMatchObject({ code });
        await client.query('ROLLBACK TO SAVEPOINT invalid_data');
      }
      const user = (await client.query('INSERT INTO "User" (email,"passwordHash") VALUES ($1,$2) RETURNING id', ['task523@example.test', 'not-a-login-hash'])).rows[0];
      const order = (await client.query('INSERT INTO "Order" ("userId",total,"idempotencyKey") VALUES ($1,10000,$2) RETURNING id', [user.id, 'task523-key'])).rows[0];
      await client.query('SAVEPOINT invalid_key');
      await expect(client.query('INSERT INTO "Order" ("userId",total,"idempotencyKey") VALUES ($1,10000,$2)', [user.id, 'task523-key'])).rejects.toMatchObject({ code: '23505' });
      await client.query('ROLLBACK TO SAVEPOINT invalid_key');
      for (const [sugar, ice] of [[25, 'NORMAL'], [50, 'EXTRA']]) {
        await client.query('SAVEPOINT invalid_preference');
        await expect(client.query('INSERT INTO "OrderItem" ("orderId",quantity,toppings,"unitPrice",subtotal,"sugarLevel","iceLevel") VALUES ($1,1,\'[]\',10000,10000,$2,$3)', [order.id, sugar, ice])).rejects.toMatchObject({ code: '23514' });
        await client.query('ROLLBACK TO SAVEPOINT invalid_preference');
      }
      await client.query('INSERT INTO "OrderItem" ("orderId",quantity,toppings,"unitPrice",subtotal) VALUES ($1,1,\'[]\',10000,10000)', [order.id]);
    } finally { await client.query('ROLLBACK'); client.release(); }
  });
});
