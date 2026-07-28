import { getCityDisplayRates } from '@/lib/city-rate-service';

export type ShopPrice = {
  ratePerGramPaise: bigint;
  metalValuePaise: bigint;
  serviceChargePaise: bigint;
  gstPaise: bigint;
  totalPaise: bigint;
};

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
  return { ratePerGramPaise, metalValuePaise, serviceChargePaise, gstPaise, totalPaise: metalValuePaise + serviceChargePaise + gstPaise };
}

export async function getTrichyShopRates() {
  const snapshot = await getCityDisplayRates('tiruchirappalli');
  const gold = snapshot.rates.find((rate) => rate.id === 'gold-22k');
  const silver = snapshot.rates.find((rate) => rate.id === 'silver-gram');
  if (!gold || !silver) throw new Error('Trichy rates are temporarily unavailable.');
  return {
    gold22kPerGramPaise: BigInt(Math.round(gold.price * 100)),
    silver999PerGramPaise: BigInt(Math.round(silver.price * 100)),
    source: snapshot.source,
    recordedAt: snapshot.sourceTimestamp,
  };
}
