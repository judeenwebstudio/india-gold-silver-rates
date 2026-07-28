import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import path from 'node:path';

const root = process.cwd();
const requiredAssets = [
  'app/favicon.ico',
  'public/favicon-16x16.png',
  'public/favicon-32x32.png',
  'public/apple-touch-icon.png',
  'public/android-chrome-192x192.png',
  'public/android-chrome-512x512.png',
  'public/products/gold-22k-coin.webp',
  'public/products/silver-coin.webp',
];

test('all branding and bundled product image assets exist and are non-empty', () => {
  for (const asset of requiredAssets) {
    const absolute = path.join(root, asset);
    assert.equal(existsSync(absolute), true, `${asset} is missing`);
    assert.ok(statSync(absolute).size > 500, `${asset} is unexpectedly small`);
  }
});

test('metadata declares favicons, touch icon, manifest, Open Graph and Twitter images', async () => {
  const layout = await readFile(path.join(root, 'app/layout.tsx'), 'utf8');
  for (const value of ['/favicon.ico', '/favicon-16x16.png', '/favicon-32x32.png', '/apple-touch-icon.png', '/manifest.webmanifest']) {
    assert.match(layout, new RegExp(value.replace(/[/.]/g, '\\$&')));
  }
  assert.match(layout, /openGraph:/);
  assert.match(layout, /twitter:/);
});

test('Shop uses bundled coin fallbacks without changing pricing logic', async () => {
  const shop = await readFile(path.join(root, 'app/(public)/shop/page.tsx'), 'utf8');
  assert.match(shop, /gold-22k-coin\.webp/);
  assert.match(shop, /silver-coin\.webp/);
  assert.match(shop, /object-contain/);
  assert.match(shop, /h-\[240px\]/);
  assert.match(shop, /md:h-\[320px\]/);
  assert.match(shop, /p-6/);
  assert.match(shop, /md:p-10/);
  assert.match(shop, /product\.prices/);
});

test('Android Shop keeps both backend product images compact and contained', async () => {
  const shop = await readFile(path.join(root, 'android-ratestack/app/src/main/java/com/ratestack/app/ui/schemes/ShopLandingScreen.kt'), 'utf8');
  assert.match(shop, /height\(220\.dp\)/);
  assert.match(shop, /padding\(24\.dp\)/);
  assert.match(shop, /ContentScale\.Fit/);
  assert.match(shop, /product\.imageUrl/);
});
