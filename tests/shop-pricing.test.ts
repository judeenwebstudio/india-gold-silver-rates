import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateShopPrice } from '../lib/shop';

test('shop pricing applies 5% service charge and 3% GST separately', () => {
  const price = calculateShopPrice(1_000_00n, 2, 1);
  assert.equal(price.metalValuePaise, 200_000n);
  assert.equal(price.serviceChargePaise, 10_000n);
  assert.equal(price.gstPaise, 6_300n);
  assert.equal(price.totalPaise, 216_300n);
});

test('shop pricing multiplies selected weight and quantity', () => {
  const one = calculateShopPrice(100_00n, 10, 1);
  const three = calculateShopPrice(100_00n, 10, 3);
  assert.equal(three.totalPaise, one.totalPaise * 3n);
});
