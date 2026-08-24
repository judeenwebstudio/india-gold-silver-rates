import type { Metadata } from "next";

import { Footer } from "@/components/Footer";
import { CouponBanner } from "@/components/CouponBanner";
import { Header } from "@/components/Header";
import { HistoricalChart } from "@/components/HistoricalChart";
import { HomeRateExperience } from "@/components/HomeRateExperience";
import { ShopCatalogue } from "@/components/shop/ShopCatalogue";
import {
  getCityDisplayRates,
  getPublicLocations,
} from "@/lib/city-rate-service";
import { PRODUCTION_SITE_URL } from "@/lib/legal-metadata";

export const metadata: Metadata = {
  title: { absolute: "Gold Rate Today in India: 22K, 24K & Silver | RateStack" },
  description:
    "Check today's 22K and 24K gold rates and silver rates in India, compare indicative city prices, and estimate metal value with RateStack calculators.",
  alternates: { canonical: PRODUCTION_SITE_URL },
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const locations = await getPublicLocations();
  const allCities = locations.flatMap((state) =>
    state.cities.map((city) => ({ ...city, stateId: state.id })),
  );
  const defaultCity =
    allCities.find((city) => city.slug === "chennai") ?? allCities[0];

  if (!defaultCity) {
    throw new Error("No active city is configured for the public homepage.");
  }

  const initialSnapshot = await getCityDisplayRates(defaultCity.slug);

  return (
    <>
      <Header />
      <CouponBanner />
      <main>
        <HomeRateExperience
          states={locations}
          initialSnapshot={initialSnapshot}
        />
        <HistoricalChart />
        <ShopCatalogue embedded />
      </main>
      <Footer />
    </>
  );
}
