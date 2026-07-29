import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
const app = read('android-ratestack/app/src/main/java/com/ratestack/app/RateStackApp.kt');
const shop = read('android-ratestack/app/src/main/java/com/ratestack/app/ui/shop/NativeShopScreen.kt');
const api = read('android-ratestack/app/src/main/java/com/ratestack/app/data/RateStackApi.kt');
const gradle = read('android-ratestack/app/build.gradle.kts');

test('Android primary navigation uses native Shop and My Orders', () => {
  assert.match(app, /com\.ratestack\.app\.ui\.shop\.NativeShopScreen/);
  assert.match(app, /com\.ratestack\.app\.ui\.shop\.MyOrdersScreen/);
  assert.match(app, /BottomItem\(Routes\.MY_ORDERS, "My Orders"/);
  assert.doesNotMatch(app, /BottomItem\(Routes\.FAVORITES, "Favorites"/);
  assert.doesNotMatch(app, /com\.ratestack\.app\.ui\.schemes\.ShopLandingScreen\(/);
});

test('native Shop loads API products and performs verified checkout', () => {
  for (const value of ['ApiProvider.service.getShop()', 'product.availableWeights', 'ContentScale.Fit', 'getPaymentConfig()', 'createShopCheckout', 'verifyShopPayment', '"Buy Now"']) {
    assert.ok(shop.includes(value), `missing ${value}`);
  }
  assert.ok(api.includes('api/v1/me/orders'));
});

test('Android production configuration is correct and version is bumped', () => {
  assert.ok(gradle.includes('"https://ratestack.in"'));
  assert.match(gradle, /configuredVersionCode[\s\S]*?\.orElse\("2"\)/);
  assert.match(gradle, /configuredVersionName[\s\S]*?\.orElse\("1\.1\.0"\)/);
});

test('Settings exposes auth, legal, BIS, email and social destinations', () => {
  for (const value of ['"Login"', '"Register"', '"Continue with Google"', '"/about-us"', '"/terms-and-conditions"', '"/refund-policy"', '"/shipping-policy"', '"/privacy-policy"', '"/faq"', '"/contact-us"', '"HM/C-6590483527"', '"info@ratestack.in"', '"https://facebook.com/"', '"https://x.com/"', '"https://instagram.com/"']) {
    assert.ok(app.includes(value), `missing ${value}`);
  }
});
