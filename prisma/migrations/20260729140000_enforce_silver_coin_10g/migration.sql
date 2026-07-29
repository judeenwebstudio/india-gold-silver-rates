-- Restrict future Silver Coin purchases to the approved 10g denomination.
-- Historical ShopOrder rows are intentionally unchanged.
UPDATE "ShopProduct"
SET "availableWeightsGramsJson" = '[10]'::jsonb,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'silver-coin';
