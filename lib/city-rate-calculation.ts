export class CityRateDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CityRateDataError";
  }
}

export function roundRate(value: number, decimals = 4) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function calculateCityDisplayRate(baseRate: number, cityAdjustment: number) {
  if (!Number.isFinite(baseRate) || baseRate <= 0) {
    throw new CityRateDataError("A valid national base rate is required.");
  }

  if (!Number.isFinite(cityAdjustment)) {
    throw new CityRateDataError("A valid city adjustment is required.");
  }

  const displayRate = roundRate(baseRate + cityAdjustment);
  if (displayRate <= 0) {
    throw new CityRateDataError("The city adjustment results in a non-positive display rate.");
  }

  return displayRate;
}
