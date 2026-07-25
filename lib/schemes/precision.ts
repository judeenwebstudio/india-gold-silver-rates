/**
 * RateStack Savings Scheme Module - Precision Utilities
 * Strictly operates on integer paise, integer milligrams, and basis points.
 * Floating point arithmetic is forbidden for money and weight calculations.
 */

// 1 INR = 100 Paise
export function inrToPaise(inr: number | string): bigint {
  const val = typeof inr === 'string' ? parseFloat(inr) : inr;
  if (isNaN(val) || val < 0) return 0n;
  return BigInt(Math.round(val * 100));
}

export function paiseToInrNumber(paise: bigint | number): number {
  const p = typeof paise === 'bigint' ? Number(paise) : paise;
  return p / 100;
}

export function formatPaiseToInr(paise: bigint | number): string {
  const p = typeof paise === 'bigint' ? Number(paise) : paise;
  const inr = p / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(inr);
}

// 1 Gram = 1,000 Milligrams
export function gramsToMilligrams(grams: number | string): bigint {
  const val = typeof grams === 'string' ? parseFloat(grams) : grams;
  if (isNaN(val) || val < 0) return 0n;
  return BigInt(Math.round(val * 1000));
}

export function milligramsToGrams(mg: bigint | number): number {
  const val = typeof mg === 'bigint' ? Number(mg) : mg;
  return val / 1000;
}

export function formatMilligramsToGrams(mg: bigint | number): string {
  const grams = milligramsToGrams(mg);
  return `${grams.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 3 })} g`;
}

// Basis points calculation: e.g. 300 basis points = 3.00%
export function calculatePercentagePaise(basePaise: bigint, basisPoints: number): bigint {
  return (basePaise * BigInt(basisPoints)) / 10000n;
}

/**
 * Calculate metal value from rate (paise per gram) and weight (milligrams)
 * metalValue = (ratePerGramPaise * weightMilligrams) / 1000
 */
export function calculateMetalValuePaise(ratePerGramPaise: bigint, weightMilligrams: bigint): bigint {
  return (ratePerGramPaise * weightMilligrams) / 1000n;
}
