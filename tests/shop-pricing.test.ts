import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateShopPrice } from '../lib/shop';

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
