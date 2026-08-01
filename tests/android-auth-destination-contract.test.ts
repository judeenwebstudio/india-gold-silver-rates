import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

test("Android login origins are typed, persisted and cleared on logout", async () => {
  const [model, repository, viewModel] = await Promise.all([
    fs.readFile("android-ratestack/app/src/main/java/com/ratestack/app/data/PendingAuthDestination.kt", "utf8"),
    fs.readFile("android-ratestack/app/src/main/java/com/ratestack/app/data/SchemeRepository.kt", "utf8"),
    fs.readFile("android-ratestack/app/src/main/java/com/ratestack/app/ui/schemes/SchemeViewModel.kt", "utf8"),
  ]);
  assert.match(model, /DEFAULT, SHOP, DASHBOARD, CHECKOUT/);
  assert.match(repository, /pending_auth_destination/);
  assert.match(viewModel, /repository\.pendingAuthDestination\(\)/);
  assert.match(viewModel, /fun logout\(\)[\s\S]*clearPendingAuthDestination\(\)/);
});

test("Android password and Google success share destination navigation and remove Login", async () => {
  const app = await fs.readFile("android-ratestack/app/src/main/java/com/ratestack/app/RateStackApp.kt", "utf8");
  assert.equal((app.match(/navigateAfterCustomerAuth\(\)/g) ?? []).length >= 2, true);
  assert.match(app, /popUpTo\(authRoute\) \{ inclusive = true \}/);
  assert.match(app, /launchSingleTop = true/);
  assert.match(app, /AuthDestinationType\.DASHBOARD -> Routes\.MY_ORDERS/);
});

test("Android checkout restores product, weight and quantity before opening payment", async () => {
  const shop = await fs.readFile("android-ratestack/app/src/main/java/com/ratestack/app/ui/shop/NativeShopScreen.kt", "utf8");
  assert.match(shop, /onCheckoutLogin\(id, selected\.first, selected\.second\)/);
  assert.match(shop, /pending\?\.validCheckout\(\) == true/);
  assert.match(shop, /checkoutSelection = Triple\(product, weight, quantity\)/);
  assert.match(shop, /onPendingCheckoutRestored\(\)/);
});
