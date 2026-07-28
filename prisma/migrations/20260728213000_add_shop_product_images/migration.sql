ALTER TABLE "ShopProduct"
  ADD COLUMN "imageData" BYTEA,
  ADD COLUMN "imageMimeType" TEXT;

UPDATE "ShopProduct"
SET "imageUrl" = CASE
  WHEN "slug" = 'gold-22k-coin' THEN '/products/gold-22k-coin.webp'
  WHEN "slug" = 'silver-coin' THEN '/products/silver-coin.webp'
  ELSE "imageUrl"
END
WHERE "imageUrl" IS NULL;
