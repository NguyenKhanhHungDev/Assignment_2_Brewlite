import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { AuthService } from '../src/auth/auth.service.js';
import { PAYMENT_ORDERS_STORE } from '../src/payments/payments.contract.js';
import { PaymentReadDatabase } from '../src/payments/payment-read-database.js';
import { RecipesPrismaAdapter } from '../src/recipes/recipes.prisma-adapter.js';

describe('Payments HTTP (mocked repository & auth store, no database)', () => {
  let app: INestApplication;
  let customerToken: string;
  let adminToken: string;

  const samplePayment = {
    paymentId: 456,
    provider: 'ZALOPAY',
    transactionRef: '261113_10_456',
    amount: 70000,
    status: 'PENDING',
    paidAt: null,
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(RecipesPrismaAdapter)
      .useValue({ findAll: async () => [], findById: async () => null })
      .overrideProvider(AuthService)
      .useValue({
        isSessionCurrent: async () => true,
        me: async (id: number) => ({
          id,
          email: id === 99 ? 'admin@brewlite.local' : 'user@brewlite.local',
          role: id === 99 ? 'ADMIN' : 'CUSTOMER',
        }),
      })
      .overrideProvider(PAYMENT_ORDERS_STORE)
      .useValue({
        getOrderPaymentStatus: async (userId: number, orderId: number) => ({
          orderId,
          orderStatus: 'PENDING',
          latestPayment: userId === 7 ? samplePayment : null,
        }),
        listPendingZalopayAttempts: async () => [],
      })
      .overrideProvider(PaymentReadDatabase)
      .useValue({
        order: {
          findFirst: async ({ where }: { where: { id: number; userId: number } }) =>
            where.id === 10 && where.userId === 7
              ? {
                  id: 10,
                  status: 'PENDING',
                  expiresAt: new Date('2026-11-13T10:15:00.000Z'),
                  payments: [
                    {
                      id: 456,
                      provider: 'ZALOPAY',
                      transactionRef: '261113_10_456',
                      amount: 70000,
                      status: 'PENDING',
                      paidAt: null,
                      createdAt: new Date('2026-11-13T10:00:00.000Z'),
                    },
                  ],
                }
              : null,
        },
        payment: {
          count: async () => 1,
          findMany: async () => [
            {
              id: 456,
              orderId: 10,
              provider: 'ZALOPAY',
              transactionRef: '261113_10_456',
              amount: 70000,
              status: 'RECONCILIATION_REQUIRED',
              order: { id: 10, status: 'PENDING' },
            },
          ],
        },
        $transaction: async <T>(ops: Promise<T>[]) => Promise.all(ops),
      })
      .compile();

    app = module.createNestApplication();
    await app.init();

    const jwt = module.get(JwtService);
    customerToken = await jwt.signAsync({ sub: 7, sessionVersion: 0 });
    adminToken = await jwt.signAsync({ sub: 99, sessionVersion: 0 });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('requires authentication on customer and admin payment endpoints', async () => {
    await request(app.getHttpServer())
      .post('/payments/zalopay/create')
      .send({ orderId: 10 })
      .expect(401);
    await request(app.getHttpServer()).get('/payments/10/status').expect(401);
    await request(app.getHttpServer()).get('/payments/10/details').expect(401);
    await request(app.getHttpServer())
      .get('/payments/admin/transactions')
      .expect(401);
  });

  it('forbids non-admin customer from admin payment routes', async () => {
    await request(app.getHttpServer())
      .get('/payments/admin/reconciliation')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('allows admin to read reconciliation queue and rejects invalid page query', async () => {
    const res = await request(app.getHttpServer())
      .get('/payments/admin/reconciliation')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.total).toBe(1);
    expect(res.body.payments[0].status).toBe('RECONCILIATION_REQUIRED');

    await request(app.getHttpServer())
      .get('/payments/admin/reconciliation?page=0')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('returns payment status and safe payment details for authenticated order owner', async () => {
    const statusRes = await request(app.getHttpServer())
      .get('/payments/10/status')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(statusRes.body.orderId).toBe(10);
    expect(statusRes.body.latestPayment.provider).toBe('ZALOPAY');

    const detailsRes = await request(app.getHttpServer())
      .get('/payments/10/details')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(detailsRes.body.orderId).toBe(10);
    expect(detailsRes.body.payments).toHaveLength(1);

    await request(app.getHttpServer())
      .get('/payments/999/details')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(404);
  });

  it('returns 410 Gone for deprecated mock POST /payments endpoint', async () => {
    await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ orderId: 10 })
      .expect(410);
  });
});
