import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { RecipesPrismaAdapter } from '../src/recipes/recipes.prisma-adapter.js';

const recipe = {
  id: 1, name: 'Cà phê sữa', price: 35000,
  imageUrl: '/images/products/ca-phe-sua.jpg', category: 'COFFEE', isActive: true,
  ingredients: [{ ingredientId: 1, quantity: 20,
    ingredient: { name: 'Cà phê', unit: 'g', stock: 200, reserved: 40 } }],
};

describe('Products HTTP (mock repository, no database)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(RecipesPrismaAdapter)
      .useValue({
        findAll: async () => [recipe, { ...recipe, id: 2, isActive: false }],
        findById: async (id: number) => id === 1 ? recipe : null,
      }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => { await app?.close(); });

  it('serves the public menu without inactive recipes', async () => {
    const response = await request(app.getHttpServer()).get('/products').expect(200);
    expect(response.body).toEqual([{
      id: 1, name: recipe.name, price: 35000, imageUrl: recipe.imageUrl,
      category: 'COFFEE', stock: 8, stockBySize: { S: 10, M: 8, L: 6 },
    }]);
  });
  it('serves details without authentication', async () => {
    const response = await request(app.getHttpServer()).get('/products/1').expect(200);
    expect(response.body.id).toBe(1);
  });
  it('returns 404 for a missing product', async () => {
    await request(app.getHttpServer()).get('/products/999').expect(404);
  });
  it.each(['abc', '1.5', '0', '-1', '2147483648', '999999999999999999'])
    ('rejects invalid product id %s before querying the database', async (id) => {
      await request(app.getHttpServer()).get(`/products/${id}`).expect(400);
    });
});
