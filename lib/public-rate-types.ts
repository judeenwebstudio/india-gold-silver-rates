export type PublicCityOption = {
  id: string;
  name: string;
  slug: string;
};

export type PublicStateOption = {
  id: string;
  name: string;
  slug: string;
  code: string;
  cities: PublicCityOption[];
};

export type DisplayRate = {
  id: "gold-24k" | "gold-22k" | "gold-18k" | "gold-14k" | "silver-gram" | "silver-kg";
  label: string;
  shortLabel: string;
  purity: string;
  unit: string;
  metal: "gold" | "silver";
  price: number;
  basePrice: number;
  adjustment: number;
  previousPrice: number | null;
  change: number | null;
  changePercent: number | null;
};

export type PublicRateSnapshot = {
  location: {
    cityId: string | null;
    cityName: string;
    citySlug: string | null;
    stateId: string | null;
    stateName: string;
    stateSlug: string | null;
  };
  rates: DisplayRate[];
  source: string;
  sourceTimestamp: string;
  lastUpdatedAt: string;
  indicative: boolean;
};

export type MajorCityRate = {
  city: string;
  citySlug: string;
  state: string;
  gold24k: number;
  gold22k: number;
  silverKg: number;
};
