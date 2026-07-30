ALTER TABLE "DeliveryAddress"
  ADD COLUMN "fullName" TEXT,
  ADD COLUMN "mobile" TEXT;

UPDATE "DeliveryAddress" AS address
SET
  "fullName" = COALESCE(customer."fullName", 'RateStack Customer'),
  "mobile" = COALESCE(customer."phone", '0000000000')
FROM "SchemeUser" AS customer
WHERE customer."id" = address."userId";

ALTER TABLE "DeliveryAddress"
  ALTER COLUMN "fullName" SET NOT NULL,
  ALTER COLUMN "mobile" SET NOT NULL;

CREATE UNIQUE INDEX "DeliveryAddress_one_default_per_user"
  ON "DeliveryAddress" ("userId")
  WHERE "isDefault" = true;
