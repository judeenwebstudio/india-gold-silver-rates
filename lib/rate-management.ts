export type ManagedMetalType = "GOLD" | "SILVER";

export type ManagedPurity = "K24" | "K22" | "K18" | "K14" | "P999" | "P925";

export type RateFormField =
  | "metalType"
  | "stateId"
  | "cityId"
  | "purity"
  | "pricePerGram"
  | "pricePerKilogram"
  | "recordedAt";

export type RateActionState = {
  status: "idle" | "error";
  message: string;
  fieldErrors?: Partial<Record<RateFormField, string>>;
};

export type RateLocationOption = {
  id: string;
  name: string;
  cities: Array<{
    id: string;
    name: string;
  }>;
};

export type EditableRate = {
  id: string;
  stateId: string;
  cityId: string;
  purity: ManagedPurity;
  pricePerGram: string;
  pricePerKilogram: string;
  recordedAt: string;
};

export const METAL_MANAGEMENT = {
  GOLD: {
    label: "Gold",
    route: "/admin/gold-rates",
    marker: "Au",
    purities: ["K24", "K22", "K18", "K14"] as ManagedPurity[],
  },
  SILVER: {
    label: "Silver",
    route: "/admin/silver-rates",
    marker: "Ag",
    purities: ["P999", "P925"] as ManagedPurity[],
  },
} as const;

export const PURITY_LABELS: Record<ManagedPurity, string> = {
  K24: "24K",
  K22: "22K",
  K18: "18K",
  K14: "14K",
  P999: "999",
  P925: "925",
};

export function isManagedMetal(value: string): value is ManagedMetalType {
  return value === "GOLD" || value === "SILVER";
}

export function isManagedPurity(value: string): value is ManagedPurity {
  return value in PURITY_LABELS;
}

export function isPurityAllowedForMetal(
  metalType: ManagedMetalType,
  purity: ManagedPurity,
) {
  return METAL_MANAGEMENT[metalType].purities.includes(purity);
}

export function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function formatDateTimeInput(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}
