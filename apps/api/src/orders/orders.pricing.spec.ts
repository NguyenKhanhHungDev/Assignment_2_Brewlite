import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { OrdersService } from './orders.service.js';
import { calculateUnitPrice } from './orders.pricing.js';
import type { OrderDraft, OrdersStore } from './orders.contract.js';

function fixture(price = 25000) {
  const drafts: OrderDraft[] = [];
  const unused = async (): Promise<never> => { throw new Error('Unexpected store call'); };
  const store: OrdersStore = {
    getRecipeById: async () => ({
      id: 1, name: 'Cà phê', price, isActive: true,
      ingredients: [{ ingredientId: 10, quantity: 1, ingredient: {
        id: 10, name: 'Cà phê', unit: 'g', stock: Number.MAX_SAFE_INTEGER, reserved: 0, version: 0,
      } }],
    }),
    getToppingIngredients: async () => ({
      pearl: { id: 30, name: 'Trân châu', unit: 'g', stock: 10000, reserved: 0, version: 0 },
      cream: { id: 31, name: 'Kem sữa', unit: 'ml', stock: 10000, reserved: 0, version: 0 },
    }),
    saveOrder: async (draft) => {
      drafts.push(draft);
      return { id: 1, status: 'PENDING', total: draft.total, idempotencyHash: null };
    },
    findOrderByIdempotencyKey: unused,
    updateLegacyRecipientSnapshot: unused,
    findOrderForUser: unused,
    findAdminOrder: unused,
    listAdminOrders: unused,
    expirePendingOrders: unused,
  };
  return { service: new OrdersService(store), drafts };
}

const body = (item: Record<string, unknown>) => ({
  recipientName: 'Nguyen An', items: [{ productId: 1, quantity: 1, ...item }],
});

describe('pricing and selection boundaries', () => {
  it.each([
    ['S', [], 20000], ['M', [], 25000], ['L', [], 30000],
    ['S', ['PEARL'], 25000], ['M', ['PEARL'], 30000], ['L', ['PEARL'], 35000],
    ['S', ['CREAM'], 27000], ['M', ['CREAM'], 32000], ['L', ['CREAM'], 37000],
    ['S', ['PEARL', 'CREAM'], 32000], ['M', ['PEARL', 'CREAM'], 37000],
    ['L', ['PEARL', 'CREAM'], 42000],
  ] as const)('prices %s with %j from official recipe data', async (size, toppings, expected) => {
    expect(calculateUnitPrice(25000, size, [...toppings])).toBe(expected);
    const { service, drafts } = fixture();
    const result = await service.create(7, body({ size, toppings: [...toppings], quantity: 2 }));
    expect(result.total).toBe(expected * 2);
    expect(drafts[0].items[0]).toMatchObject({ unitPrice: expected, subtotal: expected * 2 });
  });

  it.each([
    { size: 'XL' }, { size: null }, { toppings: ['PEARL', 'PEARL'] },
    { toppings: ['MILK'] }, { toppings: ['PEARL', 'CREAM', 'PEARL'] },
    { toppings: 'PEARL' }, { toppings: null },
    { quantity: 0 }, { quantity: -1 }, { quantity: 1.5 }, { quantity: '2' },
    { quantity: Number.MAX_SAFE_INTEGER + 1 }, { quantity: NaN }, { quantity: Infinity },
    { sugarLevel: 25 }, { sugarLevel: '50' }, { sugarLevel: null },
    { iceLevel: 'EXTRA' }, { iceLevel: null },
    { note: 'x'.repeat(201) }, { note: 1 }, { note: null },
    { unitPrice: 1 }, { subtotal: 1 }, { price: 1 },
  ])('rejects invalid input %j before saving', async (item) => {
    const { service, drafts } = fixture();
    await expect(service.create(7, body(item))).rejects.toBeInstanceOf(BadRequestException);
    expect(drafts).toHaveLength(0);
  });

  it.each([0, 50, 100])('preserves sugar %s and all ice levels without changing price', async (sugarLevel) => {
    const { service, drafts } = fixture();
    for (const iceLevel of ['NONE', 'LESS', 'NORMAL']) {
      expect((await service.create(7, body({ sugarLevel, iceLevel, note: '  Mang đi  ' }))).total).toBe(25000);
      expect(drafts.at(-1)?.items[0]).toMatchObject({ sugarLevel, iceLevel, note: 'Mang đi' });
    }
  });

  it('accepts 200-character notes and keeps missing legacy preferences unknown', async () => {
    const { service, drafts } = fixture();
    await service.create(7, body({ note: 'x'.repeat(200) }));
    expect(drafts[0].items[0].note).toHaveLength(200);
    await service.create(7, body({ note: '   ' }));
    expect(drafts[1].items[0]).toMatchObject({ size: 'M', toppings: [], sugarLevel: null, iceLevel: null, note: null });
  });

  it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects invalid official base price %s', async (price) => {
    const { service, drafts } = fixture(price);
    await expect(service.create(7, body({}))).rejects.toBeInstanceOf(BadRequestException);
    expect(drafts).toHaveLength(0);
  });

  it('rejects negative size price, permits a zero-price line, and rejects a zero-total order', async () => {
    expect(() => calculateUnitPrice(4999, 'S', [])).toThrow(BadRequestException);
    expect(calculateUnitPrice(5000, 'S', [])).toBe(0);
    const { service } = fixture(5000);
    await expect(service.create(7, body({ size: 'S' }))).rejects.toThrow(/lớn hơn 0/);
    expect((await service.create(7, {
      recipientName: 'Nguyen An', items: [
        { productId: 1, quantity: 1, size: 'S' }, { productId: 1, quantity: 1 },
      ],
    })).total).toBe(5000);
  });

  it('checks unit price, line subtotal and accumulated total against PostgreSQL Int', async () => {
    await expect(fixture(2147483648).service.create(7, body({}))).rejects.toThrow(/giới hạn/);
    await expect(fixture(1073741824).service.create(7, body({ quantity: 2 }))).rejects.toThrow(/giới hạn/);
    await expect(fixture(1073741824).service.create(7, {
      recipientName: 'Nguyen An', items: [{ productId: 1, quantity: 1 }, { productId: 1, quantity: 1 }],
    })).rejects.toThrow(/giới hạn/);
    expect((await fixture(2147483647).service.create(7, body({}))).total).toBe(2147483647);
  });

  it('floors BREW10 discount after summing all lines', async () => {
    const { service, drafts } = fixture(25003);
    expect((await service.create(7, { ...body({ quantity: 2 }), promoCode: ' brew10 ' })).total).toBe(45006);
    expect(drafts[0]).toMatchObject({ discount: 5000, promoCode: 'BREW10' });
  });
});
