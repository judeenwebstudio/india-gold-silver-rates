-- CreateTable
CREATE TABLE "CustomerWishlist" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerWishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerNotification" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'SYSTEM',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "deepLink" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerWishlist_customerId_productId_key" ON "CustomerWishlist"("customerId", "productId");

-- CreateIndex
CREATE INDEX "CustomerWishlist_customerId_idx" ON "CustomerWishlist"("customerId");

-- CreateIndex
CREATE INDEX "CustomerNotification_customerId_isRead_idx" ON "CustomerNotification"("customerId", "isRead");

-- AddForeignKey
ALTER TABLE "CustomerWishlist" ADD CONSTRAINT "CustomerWishlist_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "SchemeUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerWishlist" ADD CONSTRAINT "CustomerWishlist_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ShopProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerNotification" ADD CONSTRAINT "CustomerNotification_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "SchemeUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
