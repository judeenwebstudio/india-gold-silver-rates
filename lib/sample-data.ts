export type MetalRate = {
  id: string;
  label: string;
  shortLabel: string;
  purity?: string;
  unit: string;
  price: number;
  yesterday: number;
  change: number;
  changePercent: number;
  metal: "gold" | "silver";
};

export const lastUpdated = "22 July 2026, 10:42 AM IST";

export const sampleRates: MetalRate[] = [
  { id: "gold-24k", label: "24K Gold", shortLabel: "24K Gold / gram", purity: "99.9% pure", unit: "per gram", price: 10470, yesterday: 10435, change: 35, changePercent: 0.34, metal: "gold" },
  { id: "gold-22k", label: "22K Gold", shortLabel: "22K Gold / gram", purity: "91.6% pure", unit: "per gram", price: 9598, yesterday: 9566, change: 32, changePercent: 0.33, metal: "gold" },
  { id: "gold-18k", label: "18K Gold", shortLabel: "18K Gold / gram", purity: "75.0% pure", unit: "per gram", price: 7853, yesterday: 7870, change: -17, changePercent: -0.22, metal: "gold" },
  { id: "silver-gram", label: "Silver", shortLabel: "Silver / gram", purity: "Fine silver", unit: "per gram", price: 122.4, yesterday: 121.8, change: 0.6, changePercent: 0.49, metal: "silver" },
  { id: "silver-kg", label: "Silver", shortLabel: "Silver / kilogram", purity: "Fine silver", unit: "per kilogram", price: 122400, yesterday: 121800, change: 600, changePercent: 0.49, metal: "silver" },
];

export const citiesByState: Record<string, string[]> = {
  "All India": ["New Delhi", "Mumbai", "Chennai", "Kolkata", "Bengaluru", "Hyderabad"],
  Delhi: ["New Delhi"],
  Maharashtra: ["Mumbai", "Pune", "Nagpur"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"],
  Karnataka: ["Bengaluru", "Mysuru", "Mangaluru"],
  Telangana: ["Hyderabad", "Warangal"],
  "West Bengal": ["Kolkata", "Siliguri"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara"],
  Rajasthan: ["Jaipur", "Jodhpur", "Udaipur"],
};

export const cityRates = [
  { city: "Mumbai", state: "Maharashtra", gold24k: 10470, gold22k: 9598, silverKg: 122400, change: 0.34 },
  { city: "New Delhi", state: "Delhi", gold24k: 10485, gold22k: 9612, silverKg: 122400, change: 0.36 },
  { city: "Chennai", state: "Tamil Nadu", gold24k: 10510, gold22k: 9635, silverKg: 124200, change: 0.31 },
  { city: "Kolkata", state: "West Bengal", gold24k: 10470, gold22k: 9598, silverKg: 122400, change: 0.34 },
  { city: "Bengaluru", state: "Karnataka", gold24k: 10475, gold22k: 9603, silverKg: 122900, change: 0.33 },
  { city: "Hyderabad", state: "Telangana", gold24k: 10470, gold22k: 9598, silverKg: 124000, change: 0.34 },
];

export const historicalRates = [
  { day: "16 Jul", value: 10120 },
  { day: "17 Jul", value: 10240 },
  { day: "18 Jul", value: 10185 },
  { day: "19 Jul", value: 10310 },
  { day: "20 Jul", value: 10365 },
  { day: "21 Jul", value: 10435 },
  { day: "Today", value: 10470 },
];

export const newsItems = [
  { tag: "Markets", title: "What moves gold prices in India?", summary: "A simple guide to global prices, the rupee, import duty, and local demand.", readTime: "4 min read" },
  { tag: "Buying guide", title: "24K vs 22K: which gold purity fits your need?", summary: "Understand purity, durability, and why jewellery is commonly made with 22K gold.", readTime: "5 min read" },
  { tag: "Explainer", title: "How jewellers calculate your final bill", summary: "Learn where making charges, wastage, and GST enter the price you pay.", readTime: "6 min read" },
];
