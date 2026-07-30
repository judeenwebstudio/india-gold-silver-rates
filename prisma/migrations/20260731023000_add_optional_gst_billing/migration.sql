ALTER TABLE "ShopOrder" ADD COLUMN "gstInvoiceRequested" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "gstBusinessName" TEXT, ADD COLUMN "gstNumber" TEXT, ADD COLUMN "gstBillingAddress" TEXT;
CREATE TABLE "CustomerGSTProfile" ("id" TEXT NOT NULL,"customerId" TEXT NOT NULL,"businessName" TEXT NOT NULL,"gstNumber" TEXT NOT NULL,"billingAddress" TEXT NOT NULL,"isDefault" BOOLEAN NOT NULL DEFAULT true,"isActive" BOOLEAN NOT NULL DEFAULT true,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "CustomerGSTProfile_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "CustomerGSTProfile_customerId_gstNumber_key" ON "CustomerGSTProfile"("customerId","gstNumber");
CREATE INDEX "CustomerGSTProfile_customerId_isActive_isDefault_idx" ON "CustomerGSTProfile"("customerId","isActive","isDefault");
CREATE INDEX "ShopOrder_gstNumber_idx" ON "ShopOrder"("gstNumber");
ALTER TABLE "CustomerGSTProfile" ADD CONSTRAINT "CustomerGSTProfile_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "SchemeUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
