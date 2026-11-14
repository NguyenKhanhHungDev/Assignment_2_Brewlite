import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { assertLocalTestDatabase } from './test-database.js';
import { AppModule } from '../src/app.module.js';

// Explicit opt-in: never silently use a developer's normal or remote database.
assertLocalTestDatabase(process.env.DATABASE_URL);
if (process.env.BREWLITE_DB_TESTS !== '1') {
  throw new Error('Integration requires BREWLITE_DB_TESTS=1 and a local *_test database');
}

describe('Products API with real PostgreSQL and demo seed', () => {
  let app: INestApplication;
  let productId: number;
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
    const response = await request(app.getHttpServer()).get('/products').expect(200);
    expect(response.body.length).toBeGreaterThan(0);
    productId = response.body[0].id;
  });
  afterAll(async () => { await app?.close(); });

  it('reads ten seeded recipes, with real available inventory and no private fields', async () => {
    const response = await request(app.getHttpServer()).get('/products').expect(200);
    expect(response.body).toHaveLength(10);
    for (const product of response.body) {
      expect(Object.keys(product).sort()).toEqual(
        ['id', 'name', 'price', 'imageUrl', 'category', 'stock', 'stockBySize'].sort(),
      );
      expect(product.stock).toBeGreaterThanOrEqual(0);
      expect(product.stockBySize.M).toBe(product.stock);
    }
    const coffee = response.body.find((item: { name: string }) => item.name === 'Cà phê sữa');
    expect(coffee).toMatchObject({ price: 35000, category: 'COFFEE', stock: 66,
      stockBySize: { S: 83, M: 66, L: 55 } });
  });
  it('reads one product matching its list entry', async () => {
    const list = await request(app.getHttpServer()).get('/products').expect(200);
    const detail = await request(app.getHttpServer()).get(`/products/${productId}`).expect(200);
    expect(detail.body).toEqual(list.body.find((item: { id: number }) => item.id === productId));
  });
  it('returns 404 for a valid but unknown id', async () => {
    await request(app.getHttpServer()).get('/products/2147483647').expect(404);
  });
  it.each(['abc', '0', '-1', '1.5', '2147483648', '999999999999999999'])
    ('returns 400 for id %s with the real adapter mounted', async (id) => {
      await request(app.getHttpServer()).get(`/products/${id}`).expect(400);
    });
});
