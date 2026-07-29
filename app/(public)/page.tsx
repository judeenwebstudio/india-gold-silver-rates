import { Footer } from "@/components/Footer";
import { HallmarkSection } from "@/components/HallmarkSection";
import { Header } from "@/components/Header";
import { HistoricalChart } from "@/components/HistoricalChart";
import { HomeRateExperience } from "@/components/HomeRateExperience";
import { MajorCityRates } from "@/components/MajorCityRates";
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
      <main>
        <HomeRateExperience
          states={locations}
          initialSnapshot={initialSnapshot}
        />
        <HistoricalChart />
        <MajorCityRates />
        <HallmarkSection />
      </main>
      <Footer />
    </>
  );
}
