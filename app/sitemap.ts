import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const legalPaths = ["/about-us", "/terms-and-conditions", "/refund-policy", "/shipping-policy", "/privacy-policy", "/faq", "/contact-us"];
  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    ...legalPaths.map((path) => ({ url: new URL(path, baseUrl).toString(), lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
