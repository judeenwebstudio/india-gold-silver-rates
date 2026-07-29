import type { Metadata } from "next";

export function legalMetadata(title: string, description: string, path: string): Metadata {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return { title: `RateStack | ${title}`, description, alternates: { canonical: new URL(path, base).toString() } };
}
