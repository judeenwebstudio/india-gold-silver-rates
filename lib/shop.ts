import { getCityDisplayRates } from '@/lib/city-rate-service';

export type ShopPrice = {
  ratePerGramPaise: bigint;
  metalValuePaise: bigint;
  serviceChargePaise: bigint;
  gstPaise: bigint;
  shippingAmountPaise: bigint;
  totalPaise: bigint;
};

export const SILVER_COIN_WEIGHTS_GRAMS = [1, 2, 4, 8, 10, 20, 50, 100, 250, 500, 1000] as const;
export const DEFAULT_SILVER_COIN_WEIGHT_GRAMS = 10;

export function customerShopWeights(metalType: 'GOLD' | 'SILVER', configuredWeights: number[]) {
  return metalType === 'SILVER' ? [...SILVER_COIN_WEIGHTS_GRAMS] : configuredWeights;
}

export function validateShopWeight(metalType: 'GOLD' | 'SILVER', configuredWeights: number[], weightGrams: number) {
  if (metalType === 'SILVER' && !SILVER_COIN_WEIGHTS_GRAMS.includes(weightGrams as (typeof SILVER_COIN_WEIGHTS_GRAMS)[number])) {
    return { code: 'INVALID_SILVER_WEIGHT', message: 'Selected Silver Coin weight is unavailable.' };
  }
  if (metalType !== 'SILVER' && !configuredWeights.includes(weightGrams)) {
    return { code: 'INVALID_WEIGHT', message: 'Selected weight is unavailable.' };
  }
  return null;
}

export function calculateShopPrice(
  ratePerGramPaise: bigint,
  weightGrams: number,
  quantity: number,
  serviceChargeBasisPoints = 500,
  gstBasisPoints = 300,
): ShopPrice {
  const weightMilliGrams = BigInt(Math.round(weightGrams * 1000));
  const metalValuePaise = (ratePerGramPaise * weightMilliGrams * BigInt(quantity)) / 1000n;
  const serviceChargePaise = (metalValuePaise * BigInt(serviceChargeBasisPoints)) / 10_000n;
  const gstPaise = ((metalValuePaise + serviceChargePaise) * BigInt(gstBasisPoints)) / 10_000n;
  const shippingAmountPaise = 0n;
  return {
    ratePerGramPaise,
    metalValuePaise,
    serviceChargePaise,
    gstPaise,
    shippingAmountPaise,
    totalPaise: metalValuePaise + serviceChargePaise + gstPaise + shippingAmountPaise,
  };
}

export async function getTrichyShopRates() {
  const snapshot = await getCityDisplayRates('tiruchirappalli');
  const gold = snapshot.rates.find((rate) => rate.id === 'gold-22k');
  const silver = snapshot.rates.find((rate) => rate.id === 'silver-gram');
  if (!gold || !silver) throw new Error('Trichy rates are temporarily unavailable.');
  return {
    gold22kPerGramPaise: BigInt(Math.round(gold.price * 100)),
    silver999PerGramPaise: BigInt(Math.round(silver.price * 100)),
    goldSource: gold.source,
    goldSourceType: gold.sourceType,
    goldRateDate: gold.rateDate,
    silverSource: silver.source,
    silverSourceType: silver.sourceType,
    silverRateDate: silver.rateDate,
    fallbackMessage: snapshot.fallbackMessage,
  };
}
