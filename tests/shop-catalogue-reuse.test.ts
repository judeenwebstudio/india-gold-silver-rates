import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("homepage and Shop page reuse one catalogue implementation", () => {
  const home = read("app/(public)/page.tsx");
  const shop = read("app/(public)/shop/page.tsx");
  const catalogue = read("components/shop/ShopCatalogue.tsx");

  assert.match(home, /<ShopCatalogue embedded \/>/);
  assert.match(shop, /<ShopCatalogue \/>/);
  assert.match(catalogue, /fetch\("\/api\/v1\/shop"/);
  assert.match(catalogue, /\/shop\/checkout\?productId=/);
  assert.match(read("components/shop/ShopCheckout.tsx"), /\/api\/v1\/shop\/checkout/);
  assert.match(catalogue, /Purity:/);
  assert.match(catalogue, /In stock/);
  assert.match(catalogue, /Current Trichy price/);
  assert.doesNotMatch(home, /MajorCityRates/);
});
