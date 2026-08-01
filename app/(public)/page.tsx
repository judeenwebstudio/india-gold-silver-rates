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
