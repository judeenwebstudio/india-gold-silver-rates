import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('website Shop customer labels hide the service percentage and show free shipping', async () => {
  const shop = await readFile(path.join(root, 'app/(public)/shop/page.tsx'), 'utf8');
  assert.match(shop, />Metal Value</);
  assert.match(shop, />Service Charge</);
  assert.doesNotMatch(shop, /Service Charge[^<]*(?:5%|\{product\.serviceChargePercent\})/);
  assert.match(shop, />GST \(3%\)</);
  assert.match(shop, />Shipping Cost</);
  assert.match(shop, /price\.shipping === 0 \? "FREE"/);
  assert.match(shop, />Total Payable</);
});

test('My Orders and invoice summary use the required pricing wording', async () => {
  const orders = await readFile(path.join(root, 'app/(public)/shop/orders/page.tsx'), 'utf8');
  for (const label of ['Metal Value', 'Service Charge', 'GST (3%)', 'Shipping Cost', 'Total Payable']) {
    assert.match(orders, new RegExp(`>${label.replace(/[()]/g, '\\$&')}<`));
  }
  assert.match(orders, /o\.shippingAmount === 0 \? "FREE"/);
  assert.doesNotMatch(orders, /Service Charge[^<]*5%/);
});

test('Android Shop uses the same customer pricing labels and FREE formatter', async () => {
  const android = await readFile(
    path.join(root, 'android-ratestack/app/src/main/java/com/ratestack/app/ui/schemes/ShopLandingScreen.kt'),
    'utf8',
  );
  for (const label of ['Metal Value', 'Service Charge', 'GST (3%)', 'Shipping Cost', 'Total Payable']) {
    assert.match(android, new RegExp(`"${label.replace(/[()]/g, '\\$&')}"`));
  }
  assert.match(android, /== 0\.0\) "FREE"/);
  assert.doesNotMatch(android, /Service Charge.*5(?:\.0)?%/);
});

test('checkout persists numeric zero shipping and returns numeric pricing fields', async () => {
  const checkout = await readFile(path.join(root, 'app/api/v1/shop/checkout/route.ts'), 'utf8');
  const migration = await readFile(
    path.join(root, 'prisma/migrations/20260728233000_add_shop_shipping_amount/migration.sql'),
    'utf8',
  );
  assert.match(checkout, /shippingAmountPaise: price\.shippingAmountPaise/);
  assert.match(checkout, /shippingAmount: Number\(price\.shippingAmountPaise\) \/ 100/);
  assert.doesNotMatch(checkout, /shippingAmount:\s*['"]FREE['"]/);
  assert.match(migration, /"shippingAmountPaise" BIGINT NOT NULL DEFAULT 0/);
});
