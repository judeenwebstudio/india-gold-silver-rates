import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const read=(path:string)=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("default administrator resolves to SUPER_ADMIN without individual grants",async()=>{
  const [permissions,guard,seed]=await Promise.all([
    read("lib/admin-permissions.ts"),
    read("lib/admin-orders.ts"),
    read("prisma/seed.ts"),
  ]);
  assert.match(permissions,/DEFAULT_ADMIN_EMAIL="admin@indiagoldrates\.local"/);
  assert.match(permissions,/isDefaultAdministrator\(email\)\?"SUPER_ADMIN":role/);
  assert.match(permissions,/role==="SUPER_ADMIN"\|\|orderGrants\[permission\]\.includes\(role\)/);
  assert.match(guard,/resolveAdminRole\(admin\.role,admin\.email\)/);
  assert.match(seed,/role: "SUPER_ADMIN"/);
});

test("default administrator can verify payment and change order status",async()=>{
  const [actions,permissions]=await Promise.all([
    read("app/admin/(workspace)/orders/actions.ts"),
    read("lib/admin-permissions.ts"),
  ]);
  assert.match(actions,/verifyPaymentAction[\s\S]*requireOrderAdmin\("payment"\)/);
  assert.match(actions,/updateOrderStatusAction[\s\S]*requireOrderAdmin\("status"\)/);
  assert.match(permissions,/payment:\["SUPER_ADMIN","FINANCE"\]/);
  assert.match(permissions,/status:\["SUPER_ADMIN","ORDER_MANAGER","FULFILLMENT"\]/);
});

test("default administrator can perform Shiprocket actions",async()=>{
  const [actions,permissions]=await Promise.all([
    read("app/admin/(workspace)/orders/shiprocket-actions.ts"),
    read("lib/admin-permissions.ts"),
  ]);
  assert.match(actions,/requireOrderAdmin\("shiprocket"\)/);
  assert.match(actions,/createShiprocketAction/);
  assert.match(actions,/assignAwbAction/);
  assert.match(actions,/schedulePickupAction/);
  assert.match(permissions,/shiprocket:\["SUPER_ADMIN","ORDER_MANAGER","FULFILLMENT"\]/);
});

test("restricted admins remain permission-scoped",async()=>{
  const permissions=await read("lib/admin-permissions.ts");
  assert.match(permissions,/payment:\["SUPER_ADMIN","FINANCE"\]/);
  assert.match(permissions,/refund:\["SUPER_ADMIN","FINANCE"\]/);
  assert.doesNotMatch(permissions,/payment:\[[^\]]*"ORDER_MANAGER"/);
  assert.doesNotMatch(permissions,/refund:\[[^\]]*"FULFILLMENT"/);
});

test("unknown and unauthenticated users remain blocked",async()=>{
  const guard=await read("lib/admin-orders.ts");
  assert.match(guard,/if \(!session\?\.user\?\.email\) throw new Error\("ADMIN_UNAUTHORIZED"\)/);
  assert.match(guard,/if \(!admin\?\.isActive\) throw new Error\("ADMIN_FORBIDDEN"\)/);
  assert.match(guard,/if \(!hasOrderAdminPermission\(role,permission\)\) throw new Error\("ADMIN_FORBIDDEN"\)/);
});
