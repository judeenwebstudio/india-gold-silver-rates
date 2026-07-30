import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const listApi = read("app/api/v1/me/addresses/route.ts");
const itemApi = read("app/api/v1/me/addresses/[addressId]/route.ts");
const defaultApi = read("app/api/v1/me/addresses/[addressId]/default/route.ts");
const checkoutApi = read("app/api/v1/shop/checkout/route.ts");
const website = read("components/shop/ShopCheckout.tsx");
const android = read("android-ratestack/app/src/main/java/com/ratestack/app/ui/shop/NativeShopScreen.kt");
const migration = read("prisma/migrations/20260730213000_enhance_saved_addresses/migration.sql");

test("first address automatically becomes default and stores name/mobile", () => {
  assert.match(listApi, /count === 0/);
  assert.match(listApi, /fullName/);
  assert.match(listApi, /valid Indian mobile number/);
});

test("default uniqueness is transactional and database enforced", () => {
  assert.match(listApi, /updateMany/);
  assert.match(defaultApi, /updateMany/);
  assert.match(defaultApi, /prisma\.\$transaction/);
  assert.match(migration, /UNIQUE INDEX "DeliveryAddress_one_default_per_user"/);
  assert.match(migration, /WHERE "isDefault" = true/);
});

test("address item APIs enforce authenticated ownership", () => {
  assert.match(itemApi, /userId: auth\.userId/);
  assert.match(defaultApi, /userId: auth\.userId/);
  assert.doesNotMatch(itemApi, /customerId.*request|userId.*request/);
});

test("only saved address cannot be deleted", () => {
  assert.match(itemApi, /count <= 1/);
  assert.match(itemApi, /LAST_ADDRESS/);
});

test("checkout resolves saved address by authenticated owner and copies snapshot", () => {
  assert.match(checkoutApi, /id: parsed\.data\.addressId, userId: authUser\.userId/);
  assert.match(checkoutApi, /addressLine1: selectedAddress\.addressLine1/);
  assert.match(checkoutApi, /deliveryPincode: selectedAddress\.pincode/);
  assert.doesNotMatch(checkoutApi, /update.*ShopOrder.*addressLine1/s);
});

test("website offers cards, add, edit, delete, default, and review selection", () => {
  for (const text of ["Choose Delivery Address", "Use Saved Address", "Add New Delivery Address", "Deliver to this address", "Edit", "Delete", "Set as default", "Default"]) assert.match(website, new RegExp(text));
  assert.match(website, /find\(\(item: Address\) => item\.isDefault\)/);
  assert.match(website, /Confirm & Pay/);
});

test("Android uses the same address APIs and confirms before payment", () => {
  for (const text of ["Choose Delivery Address", "Add New Delivery Address", "Deliver here", "Set default", "Delete", "Edit / Save Address", "Confirm & Pay"]) assert.match(android, new RegExp(text));
  assert.match(android, /getDeliveryAddresses/);
  assert.match(android, /addressId = selected\.id/);
});
