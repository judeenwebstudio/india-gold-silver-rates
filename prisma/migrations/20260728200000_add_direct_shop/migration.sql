CREATE TABLE "ShopProduct" (
  "id" TEXT NOT NULL, "slug" TEXT NOT NULL, "name" TEXT NOT NULL,
  "metalType" "MetalType" NOT NULL, "purity" "MetalPurity" NOT NULL,
  "description" TEXT NOT NULL, "imageUrl" TEXT,
  "availableWeightsGramsJson" JSONB NOT NULL,
  "serviceChargeBasisPoints" INTEGER NOT NULL DEFAULT 500,
  "gstBasisPoints" INTEGER NOT NULL DEFAULT 300,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShopProduct_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ShopProduct_slug_key" ON "ShopProduct"("slug");
CREATE INDEX "ShopProduct_isActive_metalType_idx" ON "ShopProduct"("isActive", "metalType");

CREATE TABLE "ShopOrder" (
  "id" TEXT NOT NULL, "orderNumber" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "productId" TEXT NOT NULL, "productName" TEXT NOT NULL,
  "metalType" "MetalType" NOT NULL, "purity" "MetalPurity" NOT NULL,
  "weightGrams" DECIMAL(12,3) NOT NULL, "quantity" INTEGER NOT NULL,
  "trichyRatePerGramPaise" BIGINT NOT NULL, "metalValuePaise" BIGINT NOT NULL,
  "serviceChargeBasisPoints" INTEGER NOT NULL, "serviceChargePaise" BIGINT NOT NULL,
  "gstBasisPoints" INTEGER NOT NULL, "gstPaise" BIGINT NOT NULL,
  "totalAmountPaise" BIGINT NOT NULL, "currency" TEXT NOT NULL DEFAULT 'INR',
  "gateway" TEXT NOT NULL, "gatewayOrderId" TEXT, "gatewayPaymentId" TEXT,
  "gatewaySignature" TEXT, "paymentStatus" TEXT NOT NULL DEFAULT 'CREATED',
  "orderStatus" TEXT NOT NULL DEFAULT 'PAYMENT_PENDING', "invoiceNumber" TEXT,
  "failureCode" TEXT, "failureMessage" TEXT, "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShopOrder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ShopOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SchemeUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ShopOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ShopProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ShopOrder_orderNumber_key" ON "ShopOrder"("orderNumber");
CREATE UNIQUE INDEX "ShopOrder_invoiceNumber_key" ON "ShopOrder"("invoiceNumber");
CREATE INDEX "ShopOrder_userId_createdAt_idx" ON "ShopOrder"("userId", "createdAt");
CREATE INDEX "ShopOrder_gatewayOrderId_idx" ON "ShopOrder"("gatewayOrderId");
CREATE INDEX "ShopOrder_paymentStatus_orderStatus_idx" ON "ShopOrder"("paymentStatus", "orderStatus");

INSERT INTO "ShopProduct" ("id","slug","name","metalType","purity","description","availableWeightsGramsJson","serviceChargeBasisPoints","gstBasisPoints","isActive","updatedAt")
VALUES
('shop-gold-22k','gold-22k-coin','Gold 22K Coin','GOLD','22K','Hallmarked 22K gold coin priced using the live Trichy rate.','[1,2,4,8,10,20,50]'::jsonb,500,300,true,CURRENT_TIMESTAMP),
('shop-silver-999','silver-coin','Silver Coin','SILVER','999','Fine silver coin priced using the live Trichy rate.','[10,20,50,100,250,500,1000]'::jsonb,500,300,true,CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
