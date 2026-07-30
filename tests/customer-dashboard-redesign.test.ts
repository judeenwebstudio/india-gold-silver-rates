import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read=(path:string)=>readFileSync(path,"utf8");
const dashboard=read("components/customer/CustomerDashboard.tsx");
const api=read("app/api/v1/me/dashboard/route.ts");
const header=read("components/Header.tsx");
const android=read("android-ratestack/app/src/main/java/com/ratestack/app/ui/shop/MyOrdersScreen.kt");
const app=read("android-ratestack/app/src/main/java/com/ratestack/app/RateStackApp.kt");

test("account menu keeps only Dashboard and Logout",()=>{
  assert.match(header,/My Dashboard/); assert.match(header,/Logout/); assert.doesNotMatch(header,/My Profile|href="\/profile"/);
});
test("legacy website Profile safely redirects to Dashboard",()=>{
  assert.match(read("app/(public)/profile/page.tsx"),/redirect\("\/shop\/orders"\)/);
});
test("premium website Dashboard contains every required customer section",()=>{
  for(const section of ["Welcome","Customer Information","Orders Summary","Recent Orders","Live Order Tracking","Shiprocket Integration","Saved Addresses","Account Settings","Security","Reward Points","Notifications","Download Invoices","Payment History","Wishlist","Support Center","Quick Actions"])assert.match(dashboard,new RegExp(section));
  for(const detail of ["Courier Partner","Tracking Number","Shipment Status","Expected Delivery","Open Tracking","Buy Again","Need Help"])assert.match(dashboard,new RegExp(detail));
});
test("dashboard API is owner-scoped and never exposes Shiprocket credentials",()=>{
  assert.match(api,/userId: auth\.userId/); assert.match(api,/courierPartner/); assert.match(api,/trackingNumber/);
  assert.doesNotMatch(api,/SHIPROCKET_EMAIL|SHIPROCKET_PASSWORD|Authorization.*Shiprocket/);
});
test("Android consolidates account experience in Material 3 Dashboard",()=>{
  assert.match(app,/BottomItem\(Routes\.MY_ORDERS, "Dashboard"/); assert.doesNotMatch(app,/BottomItem\(Routes\.MY_ORDERS, "My Orders"/);
  for(const section of ["Customer Information","Orders Summary","Recent Orders","Live Order Tracking","Shiprocket Integration","Saved Addresses","Account Settings","Security","Reward Points","Notifications","Download Invoices","Payment History","Wishlist","Support Center","Quick Actions"])assert.match(android,new RegExp(section));
  for(const detail of ["AsyncImage","Delivery Address","Payment Status","Buy Again","Need Help","Open Tracking","Logout"])assert.match(android,new RegExp(detail));
  assert.match(android,/shipment\?\.timeline/);
});
test("shipment fields and invoice download are authenticated",()=>{
  const schema=read("prisma/schema.prisma"); const invoice=read("app/api/v1/me/orders/[orderId]/invoice/route.ts"); const androidApi=read("android-ratestack/app/src/main/java/com/ratestack/app/data/RateStackApi.kt");
  assert.match(schema,/courierPartner/); assert.match(schema,/shipmentTimelineJson/);
  assert.match(invoice,/userId: auth\.userId/); assert.match(invoice,/Content-Disposition/);
  assert.match(androidApi,/downloadShopInvoice/); assert.match(androidApi,/@retrofit2\.http\.Header\("Authorization"\)/);
});
