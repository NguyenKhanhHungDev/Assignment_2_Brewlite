import { describe, expect, it } from 'vitest';
import { isSize, isToppings, money, optionText, sizePrice, unitPrice } from '../lib/pricing';
import { parsePreferences, preferenceText } from '../lib/preferences';

describe('display pricing inherited from BrewLite-SE', () => {
  it.each([
    ['S', [], 20000], ['M', [], 25000], ['L', [], 30000],
    ['S', ['PEARL'], 25000], ['M', ['PEARL'], 30000], ['L', ['PEARL'], 35000],
    ['S', ['CREAM'], 27000], ['M', ['CREAM'], 32000], ['L', ['CREAM'], 37000],
    ['S', ['PEARL', 'CREAM'], 32000], ['M', ['PEARL', 'CREAM'], 37000], ['L', ['PEARL', 'CREAM'], 42000],
  ] as const)('prices %s with %j', (size, toppings, expected) => {
    expect(unitPrice(25000, size, [...toppings])).toBe(expected);
  });

  it('rejects invalid selections and unavailable negative size prices', () => {
    expect(isSize('XL')).toBe(false);
    expect(isToppings(['PEARL', 'PEARL'])).toBe(false);
    expect(isToppings(['MILK'])).toBe(false);
    expect(isToppings(null)).toBe(false);
    for (const price of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => unitPrice(price, 'M', [])).toThrow();
    }
    expect(sizePrice(4999, 'S')).toBeNull();
    expect(sizePrice(5000, 'S')).toBe(0);
    expect(() => unitPrice(Number.MAX_SAFE_INTEGER, 'L', [])).toThrow();
  });

  it('formats price and options for the customer', () => {
    expect(money(25000)).toBe('25.000 VND');
    expect(optionText('M', [])).toBe('Size M · Không topping');
    expect(optionText('L', ['PEARL', 'CREAM'])).toBe('Size L · Trân châu, Kem');
  });
});

describe('stored preferences', () => {
  it('preserves valid preferences and trims notes', () => {
    for (const sugarLevel of [0, 50, 100]) {
      for (const iceLevel of ['NONE', 'LESS', 'NORMAL']) {
        expect(parsePreferences({ sugarLevel, iceLevel, note: '  Mang đi  ' })).toEqual({ sugarLevel, iceLevel, note: 'Mang đi' });
      }
    }
    expect(parsePreferences({ note: 'x'.repeat(200) }).note).toHaveLength(200);
  });

  it.each([null, [], 'bad', { sugarLevel: 25 }, { sugarLevel: '50' }, { iceLevel: 'EXTRA' }, { note: 1 }, { note: 'x'.repeat(201) }])('rejects invalid stored preferences %j', (value) => {
    expect(() => parsePreferences(value)).toThrow();
  });

  it('keeps legacy preferences unknown and normalizes blank notes', () => {
    expect(parsePreferences({})).toEqual({ sugarLevel: null, iceLevel: null, note: null });
    expect(parsePreferences({ note: '   ' }).note).toBeNull();
    expect(preferenceText(parsePreferences({}))).toBe('Đường: chưa ghi nhận · Đá: chưa ghi nhận');
    expect(preferenceText({ sugarLevel: 0, iceLevel: 'NONE' })).toBe('0% đường · Không đá');
  });
});
