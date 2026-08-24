import type { Metadata } from "next";

export const PRODUCTION_SITE_URL = "https://ratestack.in";

export function legalMetadata(title: string, description: string, path: string): Metadata {
  return { title: `RateStack | ${title}`, description, alternates: { canonical: new URL(path, PRODUCTION_SITE_URL).toString() } };
}
