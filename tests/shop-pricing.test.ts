import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateShopPrice, customerShopWeights, validateShopWeight } from '../lib/shop';

test('Silver exposes only 10g while Gold weights remain unchanged', () => {
  assert.deepEqual(customerShopWeights('SILVER', [10, 20, 50, 100]), [10]);
  assert.deepEqual(customerShopWeights('GOLD', [1, 2, 5, 10]), [1, 2, 5, 10]);
});

test('new Silver checkouts reject every weight except 10g', () => {
  assert.deepEqual(validateShopWeight('SILVER', [10, 20], 20), {
    code: 'INVALID_SILVER_WEIGHT',
    message: 'Silver Coin is available only in 10g.',
  });
  assert.equal(validateShopWeight('SILVER', [10], 10), null);
});

test('gold shop pricing applies 5% service charge, 3% GST and free shipping', () => {
  const price = calculateShopPrice(1_000_00n, 2, 1);
  assert.equal(price.metalValuePaise, 200_000n);
  assert.equal(price.serviceChargePaise, 10_000n);
  assert.equal(price.gstPaise, 6_300n);
  assert.equal(price.shippingAmountPaise, 0n);
  assert.equal(price.totalPaise, 216_300n);
});

test('silver shop pricing multiplies weight and quantity without shipping affecting total', () => {
  const one = calculateShopPrice(100_00n, 10, 1);
  const three = calculateShopPrice(100_00n, 10, 3);
  assert.equal(one.serviceChargePaise, one.metalValuePaise * 500n / 10_000n);
  assert.equal(three.shippingAmountPaise, 0n);
  assert.equal(
    three.totalPaise,
    three.metalValuePaise + three.serviceChargePaise + three.gstPaise,
  );
  assert.equal(three.totalPaise, one.totalPaise * 3n);
});
