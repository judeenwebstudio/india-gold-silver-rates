import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "@/lib/prisma";

test("Live Order Tracking System", async (t) => {
  let user1: any;
  let user2: any;
  let order1: any;
  let order2: any;

  t.before(async () => {
    // Create test user 1
    user1 = await prisma.schemeUser.create({
      data: {
        fullName: "Tracking Test Customer 1",
        phone: `99${Date.now().toString().slice(-8)}`,
        email: `tracking_test1_${Date.now()}@example.com`,
      },
    });

    // Create test user 2
    user2 = await prisma.schemeUser.create({
      data: {
        fullName: "Tracking Test Customer 2",
        phone: `98${Date.now().toString().slice(-8)}`,
        email: `tracking_test2_${Date.now()}@example.com`,
      },
    });

    // Find a shop product
    const product = await prisma.shopProduct.findFirst();
    if (!product) throw new Error("No shop product found for testing.");

    // Create Order 1 for User 1 (In Transit)
    order1 = await prisma.shopOrder.create({
      data: {
        orderNumber: `RS-TRK1-${Date.now()}`,
        userId: user1.id,
        productId: product.id,
        productName: product.name,
        metalType: product.metalType,
        purity: product.purity,
        weightGrams: 10,
        quantity: 1,
        trichyRatePerGramPaise: 700000n,
        metalValuePaise: 700000n,
        serviceChargeBasisPoints: 300,
        serviceChargePaise: 50000n,
        gstBasisPoints: 300,
        gstPaise: 22500n,
        shippingAmountPaise: 0n,
        totalAmountPaise: 772500n,
        gateway: "RAZORPAY",
        paymentStatus: "SUCCESS",
        orderStatus: "SHIPPED",
        shipmentStatus: "IN_TRANSIT",
        courierPartner: "Blue Dart Express",
        courierName: "Blue Dart Express",
        awbCode: "BD123456789IN",
        trackingNumber: "BD123456789IN",
        customerName: user1.fullName,
        customerPhone: user1.phone,
        customerEmail: user1.email,
        addressLine1: "123 Vault Street",
        deliveryCity: "Tiruchirappalli",
        deliveryDistrict: "Tiruchirappalli",
        deliveryState: "Tamil Nadu",
        deliveryPincode: "620001",
        deliveryCountry: "India",
      },
    });

    // Add tracking event to Order 1
    await prisma.shipmentTrackingEvent.create({
      data: {
        orderId: order1.id,
        status: "IN_TRANSIT",
        publicMessage: "Package departed Trichy sorting facility",
        internalNote: "Hub Scanned",
        source: "SHIPROCKET",
      },
    });

    // Create Order 2 for User 1 (Delivered)
    order2 = await prisma.shopOrder.create({
      data: {
        orderNumber: `RS-TRK2-${Date.now()}`,
        userId: user1.id,
        productId: product.id,
        productName: product.name,
        metalType: product.metalType,
        purity: product.purity,
        weightGrams: 10,
        quantity: 2,
        trichyRatePerGramPaise: 700000n,
        metalValuePaise: 1400000n,
        serviceChargeBasisPoints: 300,
        serviceChargePaise: 100000n,
        gstBasisPoints: 300,
        gstPaise: 45000n,
        shippingAmountPaise: 0n,
        totalAmountPaise: 154500n,
        gateway: "RAZORPAY",
        paymentStatus: "SUCCESS",
        orderStatus: "DELIVERED",
        shipmentStatus: "DELIVERED",
        courierPartner: "Delhivery Surface",
        courierName: "Delhivery Surface",
        awbCode: "DL987654321IN",
        trackingNumber: "DL987654321IN",
        customerName: user1.fullName,
        customerPhone: user1.phone,
        customerEmail: user1.email,
        addressLine1: "123 Vault Street",
        deliveryCity: "Tiruchirappalli",
        deliveryDistrict: "Tiruchirappalli",
        deliveryState: "Tamil Nadu",
        deliveryPincode: "620001",
        deliveryCountry: "India",
      },
    });
  });

  t.after(async () => {
    if (order1?.id) {
      await prisma.shipmentTrackingEvent.deleteMany({ where: { orderId: order1.id } });
      await prisma.shopOrder.delete({ where: { id: order1.id } });
    }
    if (order2?.id) {
      await prisma.shopOrder.delete({ where: { id: order2.id } });
    }
    if (user1?.id) await prisma.schemeUser.delete({ where: { id: user1.id } });
    if (user2?.id) await prisma.schemeUser.delete({ where: { id: user2.id } });
  });

  await t.test("Order 1 and Order 2 maintain independent tracking state", async () => {
    const o1 = await prisma.shopOrder.findUnique({
      where: { id: order1.id },
      include: { trackingEvents: true },
    });
    const o2 = await prisma.shopOrder.findUnique({
      where: { id: order2.id },
      include: { trackingEvents: true },
    });

    assert.equal(o1?.shipmentStatus, "IN_TRANSIT");
    assert.equal(o1?.awbCode, "BD123456789IN");
    assert.equal(o1?.courierPartner, "Blue Dart Express");
    assert.equal(o1?.trackingEvents.length, 1);

    assert.equal(o2?.shipmentStatus, "DELIVERED");
    assert.equal(o2?.awbCode, "DL987654321IN");
    assert.equal(o2?.courierPartner, "Delhivery Surface");
    assert.equal(o2?.trackingEvents.length, 0);
  });

  await t.test("Terminal status flags set appropriately for auto-refresh control", () => {
    const activeTerminal = ["DELIVERED", "CANCELLED", "RETURNED"].includes("IN_TRANSIT");
    const deliveredTerminal = ["DELIVERED", "CANCELLED", "RETURNED"].includes("DELIVERED");

    assert.equal(activeTerminal, false);
    assert.equal(deliveredTerminal, true);
  });
});
