-- CreateEnum
CREATE TYPE "SchemeStatus" AS ENUM ('ACTIVE', 'PAUSED', 'MATURED', 'REDEMPTION_REQUESTED', 'QUOTED', 'REDEEMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'WAIVED');

-- CreateEnum
CREATE TYPE "PaymentOrderStatus" AS ENUM ('CREATED', 'PENDING', 'SUCCESS', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('INSTALLMENT_CREDIT', 'MANUAL_ENTRY_CREDIT', 'PROMOTIONAL_BONUS_CREDIT', 'REVERSAL_DEBIT', 'REDEMPTION_DEBIT', 'REFUND_DEBIT');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('REQUESTED', 'QUOTED', 'USER_ACCEPTED', 'PAYMENT_PENDING', 'APPROVED', 'COIN_ALLOCATED', 'READY_FOR_COLLECTION', 'DISPATCHED', 'DELIVERED', 'COMPLETED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('DISABLED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ManualPaymentStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSED', 'REJECTED');

-- CreateTable
CREATE TABLE "MerchantConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "legalSellerName" TEXT NOT NULL,
    "gstin" TEXT NOT NULL,
    "invoiceIssuer" TEXT NOT NULL,
    "coinSupplier" TEXT NOT NULL,
    "fulfilmentEntity" TEXT NOT NULL,
    "refundLiableEntity" TEXT NOT NULL,
    "ownerApproved" BOOLEAN NOT NULL DEFAULT false,
    "caApproved" BOOLEAN NOT NULL DEFAULT false,
    "legalApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchemeUser" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "pinHash" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "kycRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchemeUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycRecord" (
    "id" TEXT NOT NULL,
    "panMasked" TEXT,
    "aadhaarMasked" TEXT,
    "alternativeIdType" TEXT,
    "alternativeIdMasked" TEXT,
    "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "documentUrlEncrypted" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchemePlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metalType" "MetalType" NOT NULL,
    "purity" "MetalPurity" NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "minMonthlyAmountPaise" BIGINT NOT NULL,
    "maxMonthlyAmountPaise" BIGINT NOT NULL,
    "presetAmountsJson" JSONB NOT NULL,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 7,
    "termsVersion" TEXT NOT NULL,
    "termsContent" TEXT NOT NULL,
    "kycRequired" BOOLEAN NOT NULL DEFAULT false,
    "visibility" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchemePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchemePlanVersion" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshotJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchemePlanVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoinProductDenomination" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "metalType" "MetalType" NOT NULL,
    "purity" "MetalPurity" NOT NULL,
    "weightMilligrams" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "mintingFeePaise" BIGINT NOT NULL DEFAULT 0,
    "packagingFeePaise" BIGINT NOT NULL DEFAULT 0,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoinProductDenomination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nominee" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT,
    "age" INTEGER,

    CONSTRAINT "Nominee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchemeEnrollment" (
    "id" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "metalType" "MetalType" NOT NULL,
    "purity" "MetalPurity" NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "monthlyAmountPaise" BIGINT NOT NULL,
    "totalScheduledAmountPaise" BIGINT NOT NULL,
    "eligiblePurchaseBalancePaise" BIGINT NOT NULL DEFAULT 0,
    "paidInstallmentCount" INTEGER NOT NULL DEFAULT 0,
    "remainingInstallmentCount" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "maturityDate" TIMESTAMP(3) NOT NULL,
    "nextDueDate" TIMESTAMP(3),
    "overdueAmountPaise" BIGINT NOT NULL DEFAULT 0,
    "status" "SchemeStatus" NOT NULL DEFAULT 'ACTIVE',
    "termsVersion" TEXT NOT NULL,
    "acceptedTermsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchemeEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstallmentSchedule" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "installmentNo" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "paymentOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstallmentSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "gateway" TEXT NOT NULL,
    "status" "PaymentOrderStatus" NOT NULL DEFAULT 'CREATED',
    "idempotencyKey" TEXT NOT NULL,
    "gatewayOrderId" TEXT,
    "gatewayPaymentId" TEXT,
    "gatewaySignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchemeLedgerEntry" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "balanceAfterPaise" BIGINT NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "paymentOrderId" TEXT,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchemeLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "paymentOrderId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "pdfPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualPaymentQueue" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "installmentNo" INTEGER,
    "amountPaise" BIGINT NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "makerAdminId" TEXT NOT NULL,
    "checkerAdminId" TEXT,
    "status" "ManualPaymentStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "proofDocumentUrl" TEXT,
    "rejectionReason" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualPaymentQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedemptionQuotation" (
    "id" TEXT NOT NULL,
    "quotationNumber" TEXT NOT NULL,
    "redemptionRequestId" TEXT NOT NULL,
    "rateSource" TEXT NOT NULL,
    "rateTimestamp" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "ratePerGramPaise" BIGINT NOT NULL,
    "selectedWeightMilligrams" BIGINT NOT NULL,
    "metalValuePaise" BIGINT NOT NULL,
    "mintingChargesPaise" BIGINT NOT NULL,
    "packagingChargesPaise" BIGINT NOT NULL,
    "gstBasisPoints" INTEGER NOT NULL DEFAULT 300,
    "gstAmountPaise" BIGINT NOT NULL,
    "deliveryChargesPaise" BIGINT NOT NULL,
    "totalGrossValuePaise" BIGINT NOT NULL,
    "eligibleBalanceAppliedPaise" BIGINT NOT NULL,
    "netDifferencePayablePaise" BIGINT NOT NULL,
    "userAccepted" BOOLEAN NOT NULL DEFAULT false,
    "userAcceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RedemptionQuotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedemptionRequest" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'REQUESTED',
    "collectionMethod" TEXT NOT NULL,
    "deliveryAddressJson" JSONB,
    "reviewedByAdminId" TEXT,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RedemptionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedemptionOrder" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "redemptionRequestId" TEXT NOT NULL,
    "finalPricePerGramPaise" BIGINT NOT NULL,
    "actualWeightMilligrams" BIGINT NOT NULL,
    "finalGstPaise" BIGINT NOT NULL,
    "finalMakingChargesPaise" BIGINT NOT NULL,
    "finalDeliveryChargesPaise" BIGINT NOT NULL,
    "finalDifferencePaidPaise" BIGINT NOT NULL,
    "paymentStatus" TEXT NOT NULL,
    "fulfillmentStatus" TEXT NOT NULL,
    "coinSerialNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RedemptionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundRequest" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "requestedAmountPaise" BIGINT NOT NULL,
    "approvedAmountPaise" BIGINT,
    "gatewayRefundId" TEXT,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "reasoning" TEXT NOT NULL,
    "approvedByAdminId" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefundRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "enrollmentId" TEXT,
    "channel" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetEntity" TEXT NOT NULL,
    "targetId" TEXT,
    "detailsJson" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SchemeUser_phone_key" ON "SchemeUser"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "SchemeUser_email_key" ON "SchemeUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SchemeUser_kycRecordId_key" ON "SchemeUser"("kycRecordId");

-- CreateIndex
CREATE INDEX "SchemeUser_phone_isActive_idx" ON "SchemeUser"("phone", "isActive");

-- CreateIndex
CREATE INDEX "SchemeUser_email_isActive_idx" ON "SchemeUser"("email", "isActive");

-- CreateIndex
CREATE INDEX "SchemePlan_isActive_visibility_idx" ON "SchemePlan"("isActive", "visibility");

-- CreateIndex
CREATE INDEX "SchemePlan_metalType_purity_idx" ON "SchemePlan"("metalType", "purity");

-- CreateIndex
CREATE UNIQUE INDEX "SchemePlanVersion_planId_version_key" ON "SchemePlanVersion"("planId", "version");

-- CreateIndex
CREATE INDEX "CoinProductDenomination_planId_inStock_idx" ON "CoinProductDenomination"("planId", "inStock");

-- CreateIndex
CREATE INDEX "CoinProductDenomination_metalType_weightMilligrams_idx" ON "CoinProductDenomination"("metalType", "weightMilligrams");

-- CreateIndex
CREATE UNIQUE INDEX "Nominee_enrollmentId_key" ON "Nominee"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "SchemeEnrollment_accountNumber_key" ON "SchemeEnrollment"("accountNumber");

-- CreateIndex
CREATE INDEX "SchemeEnrollment_userId_status_idx" ON "SchemeEnrollment"("userId", "status");

-- CreateIndex
CREATE INDEX "SchemeEnrollment_accountNumber_idx" ON "SchemeEnrollment"("accountNumber");

-- CreateIndex
CREATE INDEX "SchemeEnrollment_status_maturityDate_idx" ON "SchemeEnrollment"("status", "maturityDate");

-- CreateIndex
CREATE INDEX "SchemeEnrollment_nextDueDate_status_idx" ON "SchemeEnrollment"("nextDueDate", "status");

-- CreateIndex
CREATE INDEX "InstallmentSchedule_enrollmentId_status_idx" ON "InstallmentSchedule"("enrollmentId", "status");

-- CreateIndex
CREATE INDEX "InstallmentSchedule_dueDate_status_idx" ON "InstallmentSchedule"("dueDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "InstallmentSchedule_enrollmentId_installmentNo_key" ON "InstallmentSchedule"("enrollmentId", "installmentNo");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_orderId_key" ON "PaymentOrder"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_idempotencyKey_key" ON "PaymentOrder"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentOrder_enrollmentId_status_idx" ON "PaymentOrder"("enrollmentId", "status");

-- CreateIndex
CREATE INDEX "PaymentOrder_userId_createdAt_idx" ON "PaymentOrder"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentOrder_gatewayOrderId_idx" ON "PaymentOrder"("gatewayOrderId");

-- CreateIndex
CREATE INDEX "SchemeLedgerEntry_enrollmentId_createdAt_idx" ON "SchemeLedgerEntry"("enrollmentId", "createdAt");

-- CreateIndex
CREATE INDEX "SchemeLedgerEntry_referenceType_referenceId_idx" ON "SchemeLedgerEntry"("referenceType", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_receiptNumber_key" ON "Receipt"("receiptNumber");

-- CreateIndex
CREATE INDEX "Receipt_enrollmentId_createdAt_idx" ON "Receipt"("enrollmentId", "createdAt");

-- CreateIndex
CREATE INDEX "Receipt_receiptNumber_idx" ON "Receipt"("receiptNumber");

-- CreateIndex
CREATE INDEX "ManualPaymentQueue_status_createdAt_idx" ON "ManualPaymentQueue"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ManualPaymentQueue_enrollmentId_status_idx" ON "ManualPaymentQueue"("enrollmentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RedemptionQuotation_quotationNumber_key" ON "RedemptionQuotation"("quotationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RedemptionQuotation_redemptionRequestId_key" ON "RedemptionQuotation"("redemptionRequestId");

-- CreateIndex
CREATE INDEX "RedemptionRequest_enrollmentId_status_idx" ON "RedemptionRequest"("enrollmentId", "status");

-- CreateIndex
CREATE INDEX "RedemptionRequest_status_createdAt_idx" ON "RedemptionRequest"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RedemptionOrder_invoiceNumber_key" ON "RedemptionOrder"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RedemptionOrder_redemptionRequestId_key" ON "RedemptionOrder"("redemptionRequestId");

-- CreateIndex
CREATE INDEX "RedemptionOrder_invoiceNumber_idx" ON "RedemptionOrder"("invoiceNumber");

-- CreateIndex
CREATE INDEX "RedemptionOrder_fulfillmentStatus_createdAt_idx" ON "RedemptionOrder"("fulfillmentStatus", "createdAt");

-- CreateIndex
CREATE INDEX "RefundRequest_enrollmentId_status_idx" ON "RefundRequest"("enrollmentId", "status");

-- CreateIndex
CREATE INDEX "NotificationLog_userId_sentAt_idx" ON "NotificationLog"("userId", "sentAt");

-- CreateIndex
CREATE INDEX "NotificationLog_enrollmentId_sentAt_idx" ON "NotificationLog"("enrollmentId", "sentAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorType_actorId_idx" ON "AuditLog"("actorType", "actorId");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_targetEntity_targetId_idx" ON "AuditLog"("targetEntity", "targetId");

-- AddForeignKey
ALTER TABLE "SchemeUser" ADD CONSTRAINT "SchemeUser_kycRecordId_fkey" FOREIGN KEY ("kycRecordId") REFERENCES "KycRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchemePlanVersion" ADD CONSTRAINT "SchemePlanVersion_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SchemePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoinProductDenomination" ADD CONSTRAINT "CoinProductDenomination_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SchemePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nominee" ADD CONSTRAINT "Nominee_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "SchemeEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchemeEnrollment" ADD CONSTRAINT "SchemeEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SchemeUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchemeEnrollment" ADD CONSTRAINT "SchemeEnrollment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SchemePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallmentSchedule" ADD CONSTRAINT "InstallmentSchedule_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "SchemeEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "SchemeEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SchemeUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchemeLedgerEntry" ADD CONSTRAINT "SchemeLedgerEntry_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "SchemeEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchemeLedgerEntry" ADD CONSTRAINT "SchemeLedgerEntry_paymentOrderId_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_paymentOrderId_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "SchemeEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualPaymentQueue" ADD CONSTRAINT "ManualPaymentQueue_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "SchemeEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedemptionQuotation" ADD CONSTRAINT "RedemptionQuotation_redemptionRequestId_fkey" FOREIGN KEY ("redemptionRequestId") REFERENCES "RedemptionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedemptionRequest" ADD CONSTRAINT "RedemptionRequest_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "SchemeEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedemptionRequest" ADD CONSTRAINT "RedemptionRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SchemeUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedemptionOrder" ADD CONSTRAINT "RedemptionOrder_redemptionRequestId_fkey" FOREIGN KEY ("redemptionRequestId") REFERENCES "RedemptionRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "SchemeEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "SchemeUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
