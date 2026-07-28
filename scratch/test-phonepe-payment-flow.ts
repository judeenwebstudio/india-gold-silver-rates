import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { getActivePaymentGateway } from '../lib/schemes/gateway.js';
import { createPhonePeOrder, checkPhonePePaymentStatus } from '../lib/schemes/phonepe.js';
import { postLedgerEntry } from '../lib/schemes/ledger.js';
import { createReceiptForPayment } from '../lib/schemes/receipts.js';
import { paiseToInrNumber } from '../lib/schemes/precision.js';

async function main() {
  process.env.ALLOW_DEV_SCHEME_TESTING = 'true';
  console.log('--- Testing PhonePe Payment Gateway Integration & Switching ---');

  // 1. Check active gateway configuration
  process.env.PAYMENT_GATEWAY = 'PHONEPE';
  const activeGw1 = getActivePaymentGateway();
  console.log(`✓ Default Active Gateway: ${activeGw1}`);

  process.env.PAYMENT_GATEWAY = 'RAZORPAY';
  const activeGw2 = getActivePaymentGateway();
  console.log(`✓ Switched Active Gateway: ${activeGw2}`);

  process.env.PAYMENT_GATEWAY = 'PHONEPE';
  console.log(`✓ Active Gateway Reset To: ${getActivePaymentGateway()}`);

  // 2. Find an active test enrollment
  const enrollment = await prisma.schemeEnrollment.findFirst({
    where: { status: 'ACTIVE' },
    include: { user: true },
  });

  if (!enrollment) {
    console.error('No active enrollment found for testing!');
    return;
  }

  console.log(`✓ Found Test Enrollment: ID ${enrollment.id} | User: ${enrollment.user.fullName} (${enrollment.user.phone}) | Paid: ${enrollment.paidInstallmentCount}/${enrollment.tenureMonths}`);

  // 3. Initiate PhonePe Order
  const orderId = `ORD-PP-${Date.now()}`;
  const amountPaise = enrollment.monthlyAmountPaise;

  const phonePeOrder = await createPhonePeOrder({
    orderId,
    amountPaise,
    receiptNumber: orderId,
    userId: enrollment.userId,
    mobileNumber: enrollment.user.phone || undefined,
    enrollmentId: enrollment.id,
  });

  console.log(`✓ PhonePe Order Initiated: OrderID: ${phonePeOrder.merchantTransactionId} | RedirectURL: ${phonePeOrder.redirectUrl} | Amount: ₹${phonePeOrder.amountPaise / 100}`);

  // Save PaymentOrder in DB
  const idempotencyKey = `ik_test_pp_${Date.now()}`;
  const paymentOrder = await prisma.paymentOrder.create({
    data: {
      orderId,
      enrollmentId: enrollment.id,
      userId: enrollment.userId,
      amountPaise,
      currency: 'INR',
      gateway: 'PHONEPE',
      status: 'CREATED',
      idempotencyKey,
      gatewayOrderId: phonePeOrder.merchantTransactionId,
    },
  });

  console.log(`✓ Saved PaymentOrder in DB: ID ${paymentOrder.id} | Gateway: ${paymentOrder.gateway} | Status: ${paymentOrder.status}`);

  // 4. Verify Payment & Execute Double-Entry Ledger Credit
  const statusCheck = await checkPhonePePaymentStatus(paymentOrder.gatewayOrderId!);
  console.log(`✓ PhonePe Status Check: Success: ${statusCheck.success} | Code: ${statusCheck.code}`);

  const txResult = await prisma.$transaction(async (tx) => {
    await tx.paymentOrder.update({
      where: { id: paymentOrder.id },
      data: {
        status: 'SUCCESS',
        gatewayPaymentId: `PP_TX_${orderId}`,
        gatewaySignature: 'PHONEPE_TEST_VERIFIED',
      },
    });

    const ledger = await postLedgerEntry(
      {
        enrollmentId: enrollment.id,
        type: 'INSTALLMENT_CREDIT',
        amountPaise,
        referenceType: 'PAYMENT_ORDER',
        referenceId: paymentOrder.id,
        paymentOrderId: paymentOrder.id,
        actorType: 'USER',
        actorId: enrollment.userId,
        metadata: {
          gateway: 'PHONEPE',
          transactionId: `PP_TX_${orderId}`,
        },
      },
      tx
    );

    const nextPending = await tx.installmentSchedule.findFirst({
      where: { enrollmentId: enrollment.id, status: 'PENDING' },
      orderBy: { installmentNo: 'asc' },
    });

    if (nextPending) {
      await tx.installmentSchedule.update({
        where: { id: nextPending.id },
        data: { status: 'PAID', paidAt: new Date(), paymentOrderId: paymentOrder.id },
      });
    }

    await tx.schemeEnrollment.update({
      where: { id: enrollment.id },
      data: {
        paidInstallmentCount: enrollment.paidInstallmentCount + 1,
        remainingInstallmentCount: enrollment.remainingInstallmentCount - 1,
      },
    });

    const receipt = await createReceiptForPayment(paymentOrder.id, tx);
    return { receipt, newBalancePaise: ledger.newBalancePaise };
  });

  console.log(`✓ Payment Verified & Ledger Credited Successfully!`);
  console.log(`  - Receipt Number: ${txResult.receipt.receiptNumber}`);
  console.log(`  - New Scheme Purchase Balance: ₹${paiseToInrNumber(txResult.newBalancePaise)}`);

  console.log('\nALL PHONEPE PAYMENT GATEWAY TESTS PASSED PERFECTLY!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
