import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { DEFAULT_CUSTOMER_RETURN_TO, safeCustomerReturnTo } from "../lib/customer-auth-return.js";

test("MobileBottomNavigation component file exists and contains mobile navigation rules", async () => {
  const componentContent = await fs.readFile("components/shop/MobileBottomNavigation.tsx", "utf8");
  
  // 1. Visible at mobile width
  assert.match(componentContent, /fixed bottom-0/);
  assert.match(componentContent, /grid-cols-3/);

  // 2. Hidden at desktop width
  assert.match(componentContent, /md:hidden/);

  // 3. Home route active state
  assert.match(componentContent, /pathname === "\/"/);

  // 4. Shop route active state
  assert.match(componentContent, /pathname\.startsWith\("\/shop"\)/);
  assert.match(componentContent, /pathname\.startsWith\("\/checkout"\)/);

  // 5. Dashboard route active state
  assert.match(componentContent, /pathname\.startsWith\("\/schemes\/dashboard"\)/);
  assert.match(componentContent, /pathname\.startsWith\("\/profile"\)/);
  assert.match(componentContent, /pathname\.startsWith\("\/shop\/orders"\)/);

  // 6. Logged-out Dashboard opens auth modal with safe returnTo
  assert.match(componentContent, /setShowAuthModal\(true\)/);
  assert.match(componentContent, /safeCustomerReturnTo\(DEFAULT_CUSTOMER_RETURN_TO\)/);

  // 7. Logged-in Dashboard navigates correctly
  assert.match(componentContent, /router\.push\(DEFAULT_CUSTOMER_RETURN_TO\)/);

  // 8. Admin routes do not render it
  assert.match(componentContent, /pathname\.startsWith\("\/admin"\)/);

  // 10. Safe-area CSS is present
  assert.match(componentContent, /env\(safe-area-inset-bottom/);

  // 12. Prevent hydration mismatch
  assert.match(componentContent, /useSyncExternalStore/);
  assert.match(componentContent, /if \(!mounted\) return null/);

});


test("Public root layout mounts MobileBottomNavigation and applies mobile bottom padding", async () => {
  const layoutContent = await fs.readFile("app/(public)/layout.tsx", "utf8");
  
  // Mounted once in public layout
  assert.match(layoutContent, /import \{ MobileBottomNavigation \} from "@\/components\/shop\/MobileBottomNavigation"/);
  assert.match(layoutContent, /<MobileBottomNavigation \/>/);

  // 9. Content receives sufficient bottom padding & 11. No desktop layout regression
  assert.match(layoutContent, /pb-\[calc\(4\.5rem\+env\(safe-area-inset-bottom,0px\)\)\] md:pb-0/);
});

test("Dashboard returnTo destination validator functions safely", () => {
  assert.equal(safeCustomerReturnTo(DEFAULT_CUSTOMER_RETURN_TO), "/schemes/dashboard");
  assert.equal(safeCustomerReturnTo("/shop/orders"), "/shop/orders");
  assert.equal(safeCustomerReturnTo("https://evil.com"), DEFAULT_CUSTOMER_RETURN_TO);
});
