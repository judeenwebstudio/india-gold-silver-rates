export const SILVER_WEIGHT_OPTIONS = [1, 5, 10, 20, 50, 100, 250, 500, 1000] as const;
export const DEFAULT_SILVER_WEIGHT_GRAMS = 10;
export const SILVER_WEIGHT_STORAGE_KEY = "ratestack_silver_weight_grams";

function decimalToTenThousandths(value: number | string): bigint | null {
  const text = String(value).trim();
  if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const roundedDigit = Number(fraction[4] ?? "0");
  let scaled = BigInt(whole) * 10_000n + BigInt(fraction.slice(0, 4).padEnd(4, "0"));
  if (roundedDigit >= 5) scaled += 1n;
  return scaled > 0n ? scaled : null;
}

export function normalizeSilverPerGram(sourcePer10Gram: number | string): number | null {
  const scaled = decimalToTenThousandths(sourcePer10Gram);
  return scaled === null ? null : Number((scaled + 5n) / 10n) / 10_000;
}

export function silverValuePaise(ratePerGram: number | string, weightGrams: number): bigint | null {
  if (!SILVER_WEIGHT_OPTIONS.includes(weightGrams as (typeof SILVER_WEIGHT_OPTIONS)[number])) return null;
  const scaled = decimalToTenThousandths(ratePerGram);
  if (scaled === null) return null;
  return (scaled * BigInt(weightGrams) + 50n) / 100n;
}

export function formatSilverWeight(weightGrams: number) {
  return weightGrams === 1000 ? "1 kg" : `${weightGrams} g`;
}

export function formatPaise(paise: bigint) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(paise) / 100);
}
