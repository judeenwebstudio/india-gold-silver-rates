import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";

import { getAdSenseConfiguration } from "@/lib/adsense/config";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const baseUrl = new URL(`${protocol}://${host}`);
  const socialImage = new URL("/og.png", baseUrl).toString();
  const adsense = getAdSenseConfiguration();

  return {
    metadataBase: baseUrl,
    title: {
      default: "RateStack | Today's Gold & Silver Rates",
      template: "%s | RateStack",
    },
    description:
      "Check today's indicative gold and silver rates in Indian cities by purity, backed by current national bullion rates.",
    keywords: [
      "gold rate today",
      "silver rate today",
      "gold price India",
      "24K gold rate",
      "22K gold rate",
      "gold calculator",
    ],
    authors: [{ name: "RateStack" }],
    creator: "RateStack",
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    manifest: "/manifest.webmanifest",
    openGraph: {
      type: "website",
      locale: "en_IN",
      url: baseUrl,
      siteName: "RateStack",
      title: "RateStack | India Gold & Silver Rates",
      description: "Clear daily bullion rates, city comparisons, and a simple purchase calculator.",
      images: [{ url: socialImage, width: 1200, height: 630, alt: "RateStack — Gold and silver rates" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "RateStack | India Gold & Silver Rates",
      description: "Clear daily bullion rates, city comparisons, and a simple purchase calculator.",
      images: [socialImage],
    },
    robots: { index: true, follow: true },
    other: adsense.client
      ? { "google-adsense-account": adsense.client }
      : undefined,
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#171411",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body>{children}</body>
    </html>
  );
}
