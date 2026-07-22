import { z } from "zod";

export const CITY_ADJUSTMENT_FIELDS = [
  { key: "gold24KAdjustment", label: "Gold 24K", metal: "Gold", purity: "24K" },
  { key: "gold22KAdjustment", label: "Gold 22K", metal: "Gold", purity: "22K" },
  { key: "gold18KAdjustment", label: "Gold 18K", metal: "Gold", purity: "18K" },
  { key: "gold14KAdjustment", label: "Gold 14K", metal: "Gold", purity: "14K" },
  { key: "silver999Adjustment", label: "Silver 999", metal: "Silver", purity: "999" },
] as const;

export type CityAdjustmentField = (typeof CITY_ADJUSTMENT_FIELDS)[number]["key"];

export function getCityAdjustmentLimit() {
  const parsed = z.coerce.number().positive().finite().safeParse(
    process.env.CITY_ADJUSTMENT_MAX_ABS ?? "5000",
  );

  return parsed.success ? parsed.data : 5000;
}

export function cityAdjustmentSchema() {
  const limit = getCityAdjustmentLimit();
  const numericAdjustment = z.preprocess(
    (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : value),
    z.number({ error: "Enter a numeric adjustment." })
      .finite("Enter a finite numeric adjustment.")
      .min(-limit, `Adjustment must be at least -₹${limit.toLocaleString("en-IN")}.`)
      .max(limit, `Adjustment must not exceed ₹${limit.toLocaleString("en-IN")}.`),
  );

  return z.object({
    gold24KAdjustment: numericAdjustment,
    gold22KAdjustment: numericAdjustment,
    gold18KAdjustment: numericAdjustment,
    gold14KAdjustment: numericAdjustment,
    silver999Adjustment: numericAdjustment,
  });
}

export function slugifyCity(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
