import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://ratestack.in";
  const legalPaths = ["/about-us", "/terms-and-conditions", "/refund-policy", "/shipping-policy", "/privacy-policy", "/faq", "/contact-us"];
  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: new URL("/calculator", baseUrl).toString(), lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    ...legalPaths.map((path) => ({ url: new URL(path, baseUrl).toString(), lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
