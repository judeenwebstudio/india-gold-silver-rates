import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

test("Wishlist API route files exist and check customer authorization", async () => {
  const [listRoute, deleteRoute] = await Promise.all([
    fs.readFile("app/api/v1/me/wishlist/route.ts", "utf8"),
    fs.readFile("app/api/v1/me/wishlist/[productId]/route.ts", "utf8"),
  ]);

  // Authorization check
  assert.match(listRoute, /authenticateSchemeUserFromRequest/);
  assert.match(listRoute, /UNAUTHORIZED/);
  assert.match(deleteRoute, /authenticateSchemeUserFromRequest/);
  assert.match(deleteRoute, /UNAUTHORIZED/);

  // Customer isolation via userId filtering
  assert.match(listRoute, /where:\s*\{\s*customerId:\s*auth\.userId/);
  assert.match(deleteRoute, /where:\s*\{\s*customerId:\s*auth\.userId,\s*productId/);

  // Duplicate prevention via upsert
  assert.match(listRoute, /prisma\.customerWishlist\.upsert/);
});

test("Notifications API route files exist and enforce read states & isolation", async () => {
  const [getRoute, readAllRoute, readSingleRoute] = await Promise.all([
    fs.readFile("app/api/v1/me/notifications/route.ts", "utf8"),
    fs.readFile("app/api/v1/me/notifications/read-all/route.ts", "utf8"),
    fs.readFile("app/api/v1/me/notifications/[notificationId]/read/route.ts", "utf8"),
  ]);

  // Authorization check across all endpoints
  assert.match(getRoute, /authenticateSchemeUserFromRequest/);
  assert.match(readAllRoute, /authenticateSchemeUserFromRequest/);
  assert.match(readSingleRoute, /authenticateSchemeUserFromRequest/);

  // Customer isolation
  assert.match(getRoute, /where:\s*\{\s*customerId:\s*auth\.userId/);
  assert.match(readAllRoute, /where:\s*\{\s*customerId:\s*auth\.userId/);
  assert.match(readSingleRoute, /where:\s*\{\s*id:\s*notificationId,\s*customerId:\s*auth\.userId/);

  // Read state updates
  assert.match(readAllRoute, /data:\s*\{\s*isRead:\s*true/);
  assert.match(readSingleRoute, /data:\s*\{\s*isRead:\s*true/);
});

test("Product Details API route returns full product details by id or slug", async () => {
  const productRoute = await fs.readFile("app/api/v1/shop/products/[productId]/route.ts", "utf8");
  assert.match(productRoute, /OR:\s*\[\s*\{\s*id:\s*productId\s*\},\s*\{\s*slug:\s*productId\s*\}/);
  assert.match(productRoute, /isActive:\s*true/);
  assert.match(productRoute, /availableWeightsGramsJson/);
});
