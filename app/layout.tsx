import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const baseUrl = new URL(`${protocol}://${host}`);
  const socialImage = new URL("/og.png", baseUrl).toString();

  return {
    metadataBase: baseUrl,
    title: {
      default: "India Gold & Silver Rates | Today's Prices",
      template: "%s | India Gold & Silver Rates",
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
    authors: [{ name: "India Gold & Silver Rates" }],
    creator: "India Gold & Silver Rates",
    openGraph: {
      type: "website",
      locale: "en_IN",
      url: baseUrl,
      siteName: "India Gold & Silver Rates",
      title: "India Gold & Silver Rates",
      description: "Clear daily bullion rates, city comparisons, and a simple purchase calculator.",
      images: [{ url: socialImage, width: 1200, height: 630, alt: "India Gold & Silver Rates" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "India Gold & Silver Rates",
      description: "Clear daily bullion rates, city comparisons, and a simple purchase calculator.",
      images: [socialImage],
    },
    robots: { index: true, follow: true },
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
